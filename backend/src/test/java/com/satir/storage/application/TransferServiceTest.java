package com.satir.storage.application;
import java.io.ByteArrayInputStream;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import com.satir.platform.api.ApiException;
import com.satir.storage.domain.StoredTransfer;
import com.satir.storage.infrastructure.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class TransferServiceTest {
    final UUID id = UUID.randomUUID(), owner = UUID.randomUUID();
    final Instant now = Instant.parse("2026-11-06T00:00:00Z");
    TransferRepository files; TransferDisk disk; PasswordEncoder passwords; TransferService service;
    @BeforeEach void setup() {
        files = mock(TransferRepository.class); disk = mock(TransferDisk.class); passwords = mock(PasswordEncoder.class);
        var manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenAnswer(i -> new SimpleTransactionStatus());
        when(disk.free()).thenReturn(200_000_000_000L); when(files.list()).thenReturn(List.of());
        service = new TransferService(files, disk, passwords, Clock.fixed(now, ZoneOffset.UTC), manager, 150_000_000_000L, 20_000_000_000L);
    }
    StoredTransfer file(String state, long size, long uploaded, Instant expiry) {
        return new StoredTransfer(id, owner, "video.mp4", size, uploaded, "a".repeat(64), null, state, 24, now, expiry);
    }
    @Test void acceptsExactlyFiftyDecimalGigabytesAndHashesPassword() {
        when(passwords.encode("123456")).thenReturn("hash");
        var f = service.start(owner,"video.mp4",50_000_000_000L,"a".repeat(64),"123456",24);
        assertThat(f.passwordHash()).isEqualTo("hash"); assertThat(f.expiresAt()).isEqualTo(now.plus(Duration.ofHours(48)));
        verify(files).insert(f);
        assertThatThrownBy(() -> service.start(owner,"a",50_000_000_001L,"a".repeat(64),null,24)).isInstanceOf(ApiException.class);
    }
    @Test void outstandingUploadsReserveTheirUnwrittenBytes() {
        when(files.list()).thenReturn(List.of(file("UPLOADING", 50_000_000_000L, 0, now.plusSeconds(1))));
        when(disk.free()).thenReturn(100_000_000_000L);
        assertThat(service.list().availableBytes()).isEqualTo(30_000_000_000L);
        assertThatThrownBy(() -> service.start(owner,"a",50_000_000_000L,"a".repeat(64),null,24))
            .isInstanceOfSatisfying(ApiException.class,e -> assertThat(e.code()).isEqualTo("STORAGE_FULL"));
        verify(files, never()).insert(any());
    }
    @Test void staleOffsetsAndExpiredTransfersNeverWrite() throws Exception {
        when(files.find(id,true)).thenReturn(file("UPLOADING",10,5,now.plusSeconds(60)));
        assertThatThrownBy(() -> service.chunk(id,0,new ByteArrayInputStream(new byte[]{1}),1)).isInstanceOf(ApiException.class);
        when(files.find(id,true)).thenReturn(file("UPLOADING",10,0,now));
        assertThatThrownBy(() -> service.chunk(id,0,new ByteArrayInputStream(new byte[]{1}),1)).isInstanceOf(ApiException.class);
        verify(disk,never()).append(any(),anyLong(),any(),anyLong());
    }
    @Test void expiryStartsAtCompletionAndRepeatedCompletionDoesNotExtendIt() throws Exception {
        var pending = file("UPLOADING",3,3,now.plusSeconds(60)); var ready = file("READY",3,3,now.plusSeconds(86400));
        when(files.find(id,true)).thenReturn(pending,ready); when(files.find(id,false)).thenReturn(ready); when(disk.size(id)).thenReturn(3L);
        assertThat(service.complete(id)).isEqualTo(ready); assertThat(service.complete(id)).isEqualTo(ready);
        verify(files,times(1)).complete(id,now.plusSeconds(86400));
    }
    @Test void cleanupRechecksExpiryAfterTakingLockSoExtensionWins() throws Exception {
        when(files.expired(now)).thenReturn(List.of(id)); when(files.find(id,true)).thenReturn(file("READY",3,3,now.plusSeconds(60)));
        service.cleanup(); verify(disk,never()).delete(any()); verify(files,never()).delete(any());
    }
    @Test void expiredCannotBeRevivedAndCleanupRetriesDiskFailures() throws Exception {
        when(files.find(id,true)).thenReturn(file("READY",3,3,now));
        assertThatThrownBy(() -> service.extend(id,24)).isInstanceOf(ApiException.class);
        when(files.expired(now)).thenReturn(List.of(id)); doThrow(new java.io.IOException()).when(disk).delete(id);
        service.cleanup(); verify(files,never()).delete(id);
    }
}
