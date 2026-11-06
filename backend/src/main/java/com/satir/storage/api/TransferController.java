package com.satir.storage.api;

import java.io.IOException;
import java.io.InputStream;
import java.io.FilterInputStream;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.satir.identity.application.Authorities;
import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.ApiException;
import com.satir.platform.ratelimit.RateLimiter;
import com.satir.storage.application.TransferService;
import com.satir.storage.domain.StoredTransfer;

@RestController
class TransferController {
    record Start(String name, long sizeBytes, String fingerprint, String password, int retentionHours) {
        @Override public String toString() { return "Start[redacted]"; }
    }
    record Extend(int hours) {}
    record Unlock(String password) { @Override public String toString() { return "Unlock[redacted]"; } }
    record Status(UUID id, String name, long sizeBytes, long uploadedBytes, String fingerprint, String state,
            boolean passwordRequired, int retentionHours, Instant expiresAt) {
        static Status of(StoredTransfer f) { return new Status(f.id(), f.name(), f.sizeBytes(), f.uploadedBytes(), f.fingerprint(),
            f.state(), f.passwordHash() != null, f.retentionHours(), f.expiresAt()); }
    }
    record Listing(List<Status> items, long availableBytes, long quotaBytes, long maxFileBytes, int chunkBytes) {}
    record Shared(UUID id, String name, Long sizeBytes, boolean passwordRequired, Instant expiresAt) {}
    private final TransferService service;
    private final RateLimiter limits;
    private final Clock clock;
    private static final RateLimiter.Limit PASSWORD_LIMIT = new RateLimiter.Limit("storage-password", 10, Duration.ofMinutes(15));
    private static final RateLimiter.Limit IP_LIMIT = new RateLimiter.Limit("storage-access", 60, Duration.ofMinutes(15));
    TransferController(TransferService service, RateLimiter limits, Clock clock) { this.service = service; this.limits = limits; this.clock = clock; }
    @GetMapping("/api/v1/studio/files")
    Listing list() { var l = service.list(); return new Listing(l.items().stream().map(Status::of).toList(), l.availableBytes(), l.quotaBytes(), TransferService.MAX_FILE, TransferService.CHUNK); }
    @PostMapping("/api/v1/studio/files")
    ResponseEntity<Status> start(@AuthenticationPrincipal SatirPrincipal owner, @RequestBody Start b) {
        return ResponseEntity.status(201).body(Status.of(service.start(owner.userId(), b.name(), b.sizeBytes(), b.fingerprint(), b.password(), b.retentionHours())));
    }
    @GetMapping("/api/v1/studio/files/{id}")
    Status status(@PathVariable UUID id) { return Status.of(service.get(id)); }
    @PostMapping("/api/v1/studio/files/{id}/chunks")
    Status chunk(@PathVariable UUID id, @RequestParam long offset, @RequestParam("file") MultipartFile file) throws IOException {
        try (var stream = file.getInputStream()) { return Status.of(service.chunk(id, offset, stream, file.getSize())); }
    }
    @PostMapping("/api/v1/studio/files/{id}/complete")
    Status complete(@PathVariable UUID id) { return Status.of(service.complete(id)); }
    @PatchMapping("/api/v1/studio/files/{id}/expiry")
    Status extend(@PathVariable UUID id, @RequestBody Extend b) { return Status.of(service.extend(id, b.hours())); }
    @DeleteMapping("/api/v1/studio/files/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) { service.delete(id); return ResponseEntity.noContent().build(); }
    @GetMapping("/api/v1/storage/{id}")
    ResponseEntity<Shared> shared(@PathVariable UUID id, HttpServletRequest request, Authentication auth) {
        var f = service.shared(id); boolean locked = !allowed(f, request, auth);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Shared(id, locked ? null : f.name(), locked ? null : f.sizeBytes(), locked, f.expiresAt()));
    }
    @PostMapping("/api/v1/storage/{id}/unlock")
    ResponseEntity<Void> unlock(@PathVariable UUID id, @RequestBody Unlock b, HttpServletRequest request) {
        String ip = request.getRemoteAddr(); String subject = id + ":" + ip;
        limit(IP_LIMIT, ip); limit(PASSWORD_LIMIT, subject);
        var f = service.shared(id);
        if (!service.passwordMatches(f, b.password())) throw new ApiException(HttpStatus.FORBIDDEN, "STORAGE_PASSWORD", "Şifre yanlış");
        HttpSession session = request.getSession();
        // Remove expired grants and bound session growth across repeated create/delete cycles.
        var names = Collections.list(session.getAttributeNames()).stream().filter(n -> n.startsWith("storage:")).toList();
        for (String name : names) {
            Object value = session.getAttribute(name);
            if (!(value instanceof Long until) || until <= clock.millis()) session.removeAttribute(name);
        }
        names = Collections.list(session.getAttributeNames()).stream().filter(n -> n.startsWith("storage:")).toList();
        if (names.size() >= 100) session.removeAttribute(names.getFirst());
        session.setAttribute("storage:" + id, f.expiresAt().toEpochMilli());
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/api/v1/storage/{id}/download")
    ResponseEntity<Resource> download(@PathVariable UUID id, HttpServletRequest request, Authentication auth) {
        var f = service.shared(id);
        if (!allowed(f, request, auth)) throw new ApiException(HttpStatus.FORBIDDEN, "STORAGE_PASSWORD", "İndirmek için şifreyi gir");
        String range = request.getHeader("Range");
        if (range != null && (range.length() > 100 || range.contains(",")))
            throw new ApiException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, "STORAGE_RANGE", "Tek bir indirme aralığı kullan");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header("Content-Disposition", ContentDisposition.attachment().filename(f.name(), StandardCharsets.UTF_8).build().toString())
            .header("X-Content-Type-Options", "nosniff").header("X-Robots-Tag", "noindex, nofollow")
            .header("Content-Security-Policy", "default-src 'none'; sandbox")
            .body(new FileSystemResource(service.path(id)) {
                @Override public InputStream getInputStream() throws IOException {
                    return new FilterInputStream(super.getInputStream()) {
                        private long checkedAt;
                        private void check() throws IOException {
                            long now = System.nanoTime();
                            if (checkedAt == 0 || now - checkedAt >= 1_000_000_000L) {
                                try { service.shared(id); }
                                catch (ApiException unavailable) { throw new IOException("Transfer expired or deleted"); }
                                checkedAt = now;
                            }
                        }
                        @Override public int read() throws IOException { check(); return super.read(); }
                        @Override public int read(byte[] bytes, int offset, int length) throws IOException {
                            check(); return super.read(bytes, offset, length);
                        }
                    };
                }
            });
    }
    private boolean allowed(StoredTransfer f, HttpServletRequest request, Authentication auth) {
        if (f.passwordHash() == null || (auth != null && auth.getAuthorities().stream().anyMatch(a -> Authorities.OWNER.equals(a.getAuthority())))) return true;
        var session = request.getSession(false);
        Object grant = session == null ? null : session.getAttribute("storage:" + f.id());
        return grant instanceof Long until && until > clock.millis();
    }
    private void limit(RateLimiter.Limit rule, String subject) {
        if (limits.blockedFor(rule, subject).isPresent()) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Çok fazla deneme; 15 dakika sonra tekrar dene");
        limits.record(rule, subject);
    }
}
