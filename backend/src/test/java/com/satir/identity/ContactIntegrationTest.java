package com.satir.identity;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.satir.support.IntegrationTest;

class ContactIntegrationTest extends IntegrationTest {
    private Map<String,Object> body() { return Map.of("name","Bir okur","email","okur@example.test","subject","Bir merhaba","message","İlk satır.\nİkinci satır."); }
    @Test void sendsOnlyToOwnerWithValidatedReplyToAndRequiresCsrf() {
        createOwner(); var guest = client(); guest.refreshCsrf();
        assertThat(guest.post("/api/v1/contact",body(),false).status()).isEqualTo(403);
        assertThat(mail.sent()).isEmpty();
        assertThat(guest.post("/api/v1/contact",body()).status()).isEqualTo(204);
        assertThat(mail.sent()).hasSize(1);
        var message = mail.sent().getFirst();
        assertThat(message.getTo()).containsExactly(OWNER_EMAIL);
        assertThat(message.getReplyTo()).isEqualTo("okur@example.test");
        assertThat(message.getFrom()).isNotEqualTo("okur@example.test");
        assertThat(message.getText()).contains("İlk satır.\nİkinci satır.");
    }
    @Test void rejectsInvalidFieldsAndHeaderInjectionWithoutSending() {
        createOwner(); var guest = client(); guest.refreshCsrf();
        for (var patch : java.util.List.of(Map.of("email","bad\r\nBcc:other@example.test"),Map.of("subject","hi\r\nBcc:other"),Map.of("message"," "),Map.of("message","x".repeat(5001)))) {
            var data = new java.util.HashMap<>(body()); data.putAll(patch);
            assertThat(guest.post("/api/v1/contact",data).status()).isEqualTo(422);
        }
        assertThat(mail.sent()).isEmpty();
    }
    @Test void reportsSmtpFailureAndMissingOwnerInsteadOfSuccess() {
        var guest = client(); guest.refreshCsrf();
        assertThat(guest.post("/api/v1/contact",body()).status()).isEqualTo(503);
        createOwner(); mail.failing(true);
        assertThat(guest.post("/api/v1/contact",body()).status()).isEqualTo(503);
        assertThat(mail.sent()).isEmpty();
    }
    @Test void limitsRepeatedContactMessages() {
        createOwner(); var guest = client(); guest.refreshCsrf();
        for (int i=0;i<3;i++) assertThat(guest.post("/api/v1/contact",body()).status()).isEqualTo(204);
        var limited = guest.post("/api/v1/contact",body());
        assertThat(limited.status()).isEqualTo(429);
        assertThat(limited.header("Retry-After")).isNotBlank();
        assertThat(mail.sent()).hasSize(3);
    }
}
