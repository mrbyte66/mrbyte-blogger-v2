package com.satir.storage.application;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.NoSuchFileException;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.slf4j.LoggerFactory;
import com.satir.platform.api.ApiException;
import com.satir.storage.domain.StoredTransfer;
import com.satir.storage.infrastructure.TransferDisk;
import com.satir.storage.infrastructure.TransferRepository;

@Service
public class TransferService {
    public static final long MAX_FILE = 50_000_000_000L;
    public static final int CHUNK = 8 * 1024 * 1024;
    private final TransferRepository files;
    private final TransferDisk disk;
    private final PasswordEncoder passwords;
    private final Clock clock;
    private final TransactionTemplate tx;
    private final long quota, reserve;
    public TransferService(TransferRepository files, TransferDisk disk, PasswordEncoder passwords, Clock clock,
            PlatformTransactionManager transactions, @Value("${satir.storage.quota-bytes}") long quota,
            @Value("${satir.storage.reserve-bytes}") long reserve) {
        this.files = files; this.disk = disk; this.passwords = passwords; this.clock = clock;
        if (quota < 1 || reserve < 0) throw new IllegalArgumentException("Invalid storage capacity settings");
        this.tx = new TransactionTemplate(transactions); this.quota = quota; this.reserve = reserve;
    }
    public record Listing(List<StoredTransfer> items, long availableBytes, long quotaBytes) {}
    public Listing list() {
        return tx.execute(status -> {
            files.capacityLock();
            var all = files.list();
            long allocated = all.stream().mapToLong(StoredTransfer::sizeBytes).sum();
            long outstanding = all.stream().mapToLong(f -> f.sizeBytes() - f.uploadedBytes()).sum();
            return new Listing(all, Math.max(0, Math.min(quota - allocated, disk.free() - reserve - outstanding)), quota);
        });
    }
    public StoredTransfer start(UUID owner, String name, long size, String fingerprint, String password, int hours) {
        hours(hours);
        if (name == null || name.isBlank() || name.length() > 240 || name.chars().anyMatch(c -> c < 32 || c == 127)
                || name.contains("/") || name.contains("\\")) throw invalid("Dosya adı geçersiz");
        if (size < 1 || size > MAX_FILE) throw invalid("Dosya 1 bayt ile 50 GB arasında olmalı");
        if (fingerprint == null || !fingerprint.matches("[a-f0-9]{64}")) throw invalid("Dosya kimliği geçersiz");
        if (password != null && !password.isEmpty() && (password.length() < 6 || password.length() > 128))
            throw invalid("Şifre 6–128 karakter olmalı");
        String hash = password == null || password.isEmpty() ? null : passwords.encode(password);
        return tx.execute(status -> {
            files.capacityLock();
            var all = files.list();
            long allocated = all.stream().mapToLong(StoredTransfer::sizeBytes).sum();
            long outstanding = all.stream().mapToLong(f -> f.sizeBytes() - f.uploadedBytes()).sum();
            if (all.size() >= 100 || allocated + size > quota || disk.free() - outstanding - size < reserve)
                throw new ApiException(HttpStatus.INSUFFICIENT_STORAGE, "STORAGE_FULL", "Yeterli boş alan yok; eski dosyaları silip tekrar dene");
            var now = clock.instant();
            var f = new StoredTransfer(UUID.randomUUID(), owner, name, size, 0, fingerprint, hash, "UPLOADING", hours, now, now.plus(Duration.ofHours(48)));
            files.insert(f); return f;
        });
    }
    public StoredTransfer get(UUID id) { return active(files.find(id, false)); }
    public StoredTransfer chunk(UUID id, long offset, InputStream input, long length) {
        if (length <= 0 || length > CHUNK) throw invalid("Parça en fazla 8 MiB olabilir");
        return tx.execute(status -> {
            var f = active(files.find(id, true));
            if (f.ready() || offset != f.uploadedBytes() || length > f.sizeBytes() - offset)
                throw new ApiException(HttpStatus.CONFLICT, "UPLOAD_OFFSET", "Yükleme konumu değişti; güncel durumdan devam et");
            if (disk.free() - length < reserve) throw new ApiException(HttpStatus.INSUFFICIENT_STORAGE, "STORAGE_FULL", "Diskte yeterli boş alan yok");
            try { disk.append(id, offset, input, length); }
            catch (IOException e) { throw new UncheckedIOException(e); }
            files.offset(id, offset + length);
            return files.find(id, false);
        });
    }
    public StoredTransfer complete(UUID id) {
        return tx.execute(status -> {
            var f = active(files.find(id, true));
            if (f.ready()) return f;
            try {
                if (f.uploadedBytes() != f.sizeBytes() || disk.size(id) != f.sizeBytes())
                    throw new ApiException(HttpStatus.CONFLICT, "UPLOAD_INCOMPLETE", "Yükleme henüz tamamlanmadı");
            } catch (NoSuchFileException e) { throw new ApiException(HttpStatus.CONFLICT, "UPLOAD_INCOMPLETE", "Dosya henüz yüklenmedi"); }
            catch (IOException e) { throw new UncheckedIOException(e); }
            files.complete(id, clock.instant().plus(Duration.ofHours(f.retentionHours())));
            return files.find(id, false);
        });
    }
    public StoredTransfer extend(UUID id, int hours) {
        hours(hours);
        return tx.execute(status -> {
            var f = active(files.find(id, true));
            if (!f.ready()) throw invalid("Önce yüklemeyi tamamla");
            Instant expiry = f.expiresAt().plus(Duration.ofHours(hours));
            if (expiry.isAfter(clock.instant().plus(Duration.ofHours(720)))) throw invalid("Kalan süre en fazla 30 gün olabilir");
            files.extend(id, expiry); return files.find(id, false);
        });
    }
    public void delete(UUID id) {
        tx.executeWithoutResult(status -> {
            files.find(id, true);
            try { disk.delete(id); } catch (IOException e) { throw new UncheckedIOException(e); }
            files.delete(id);
        });
    }
    public StoredTransfer shared(UUID id) {
        var f = get(id);
        if (!f.ready()) throw notFound();
        return f;
    }
    public boolean passwordMatches(StoredTransfer f, String password) {
        return f.passwordHash() == null || (password != null && password.length() <= 128 && passwords.matches(password, f.passwordHash()));
    }
    public Path path(UUID id) { return disk.path(id); }
    @Scheduled(fixedDelayString = "${satir.storage.cleanup-delay:PT1M}", initialDelayString = "${satir.storage.cleanup-initial-delay:PT10S}")
    public void cleanup() {
        for (UUID id : files.expired(clock.instant())) {
            try {
                tx.executeWithoutResult(status -> {
                    var f = files.find(id, true);
                    if (f.active(clock.instant())) return; // extension won the row lock
                    try { disk.delete(id); } catch (IOException e) { throw new UncheckedIOException(e); }
                    files.delete(id);
                });
            } catch (RuntimeException e) { LoggerFactory.getLogger(getClass()).warn("Temporary file cleanup will retry: {}", id); }
        }
    }
    private StoredTransfer active(StoredTransfer f) { if (!f.active(clock.instant())) throw notFound(); return f; }
    private static void hours(int hours) { if (hours < 1 || hours > 720) throw invalid("Süre 1–720 saat arasında olmalı"); }
    private static ApiException invalid(String title) { return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "STORAGE_INVALID", title); }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Dosya bulunamadı veya süresi doldu"); }
}
