package com.satir.storage;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.satir.storage.application.TransferService;
import com.satir.support.*;
import static org.assertj.core.api.Assertions.*;
class StorageIntegrationTest extends IntegrationTest {
    @Autowired TransferService transfers;
    Map<String,Object> start(String password) { return Map.of("name","video.mp4","sizeBytes",5,"fingerprint","a".repeat(64),"password",password,"retentionHours",24); }
    @Test void ownerOnlyResumableUploadPasswordAndDeletion() {
        createOwner(); var owner=ownerClient(); var guest=client(); guest.refreshCsrf();
        assertThat(guest.post("/api/v1/studio/files",start("")).status()).isEqualTo(401);
        createMember("reader@example.test","password-123",true); var member=client(); member.login("reader@example.test","password-123"); member.refreshCsrf();
        assertThat(member.get("/api/v1/studio/files").status()).isEqualTo(403);
        var created=owner.post("/api/v1/studio/files",start("123456")); assertThat(created.status()).isEqualTo(201);
        String path="/api/v1/studio/files/"+created.id(), shared="/api/v1/storage/"+created.id();
        assertThat(guest.get(shared).status()).isEqualTo(404);
        assertThat(owner.upload(path+"/chunks?offset=0","chunk",new byte[]{1,2,3}).status()).isEqualTo(200);
        assertThat(owner.upload(path+"/chunks?offset=0","chunk",new byte[]{1,2,3}).status()).isEqualTo(409);
        assertThat(owner.post(path+"/complete",null).status()).isEqualTo(409);
        assertThat(owner.get(path).json().get("uploadedBytes").asLong()).isEqualTo(3);
        assertThat(owner.upload(path+"/chunks?offset=3","chunk",new byte[]{4,5}).status()).isEqualTo(200);
        assertThat(owner.post(path+"/complete",null).status()).isEqualTo(200);
        assertThat(guest.get(shared).json().get("name").isNull()).isTrue();
        assertThat(guest.get(shared+"/download").status()).isEqualTo(403);
        assertThat(guest.post(shared+"/unlock",Map.of("password","123456"),false).status()).isEqualTo(403);
        assertThat(guest.post(shared+"/unlock",Map.of("password","bad")).code()).isEqualTo("STORAGE_PASSWORD");
        assertThat(guest.post(shared+"/unlock",Map.of("password","123456")).status()).isEqualTo(204);
        var downloaded=guest.get(shared+"/download"); assertThat(downloaded.bytes()).containsExactly(1,2,3,4,5);
        assertThat(downloaded.header("Content-Disposition")).contains("attachment"); assertThat(downloaded.header("Cache-Control")).contains("no-store");
        var partial=guest.get(shared+"/download",Map.of("Range","bytes=2-4")); assertThat(partial.status()).isEqualTo(206); assertThat(partial.bytes()).containsExactly(3,4,5);
        assertThat(client().get(shared+"/download").status()).isEqualTo(403);
        assertThat(owner.delete(path,null,Map.of()).status()).isEqualTo(204);
        assertThat(guest.get(shared+"/download").status()).isEqualTo(404);
    }
    @Test void expiryStartsAfterUploadExtensionAndPhysicalCleanup() {
        createOwner(); var owner=ownerClient();
        var f=owner.post("/api/v1/studio/files",start("")); String path="/api/v1/studio/files/"+f.id(); String download="/api/v1/storage/"+f.id()+"/download";
        // Move less than the owner's absolute session lifetime; reauthenticate after larger clock advances.
        clock.advance(Duration.ofHours(1)); owner=ownerClient();
        assertThat(owner.upload(path+"/chunks?offset=0","chunk",new byte[]{1,2,3,4,5}).status()).isEqualTo(200);
        var complete=owner.post(path+"/complete",null); assertThat(complete.status()).isEqualTo(200);
        assertThat(java.time.Instant.parse(complete.text("expiresAt"))).isCloseTo(clock.instant().plus(Duration.ofHours(24)), org.assertj.core.api.Assertions.within(1, java.time.temporal.ChronoUnit.MILLIS));
        assertThat(owner.patch(path+"/expiry",Map.of("hours",24),Map.of()).status()).isEqualTo(200);
        clock.advance(Duration.ofHours(25)); assertThat(client().get(download).status()).isEqualTo(200);
        clock.advance(Duration.ofHours(23).plusSeconds(1)); assertThat(client().get(download).status()).isEqualTo(404);
        owner=ownerClient(); assertThat(owner.patch(path+"/expiry",Map.of("hours",24),Map.of()).status()).isEqualTo(404);
        transfers.cleanup(); assertThat(transfers.path(f.id())).doesNotExist();
    }
    @Test void passwordGuessingIsRateLimited() {
        createOwner(); var owner=ownerClient(); var f=owner.post("/api/v1/studio/files",start("123456"));
        String p="/api/v1/studio/files/"+f.id(); owner.upload(p+"/chunks?offset=0","chunk",new byte[]{1,2,3,4,5}); owner.post(p+"/complete",null);
        var guest=client(); guest.refreshCsrf(); String unlock="/api/v1/storage/"+f.id()+"/unlock";
        for(int n=0;n<10;n++) assertThat(guest.post(unlock,Map.of("password","wrong")).status()).isEqualTo(403);
        assertThat(guest.post(unlock,Map.of("password","123456")).status()).isEqualTo(429);
    }
}
