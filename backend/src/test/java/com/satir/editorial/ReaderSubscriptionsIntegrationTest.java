package com.satir.editorial;

import static com.satir.support.Fixtures.article;
import static org.assertj.core.api.Assertions.assertThat;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.satir.delivery.application.OutboxWorker;
import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

class ReaderSubscriptionsIntegrationTest extends IntegrationTest {
    @Autowired OutboxWorker worker;

    private Response publish(ApiClient owner, String slug) {
        Response draft = owner.command("/api/v1/studio/articles", article("Yeni yazı", slug, "Metin."), null);
        return owner.command("/api/v1/studio/articles/" + draft.id() + "/actions",
                Map.of("action", "publish"), draft.etag());
    }

    @Test void onlyVerifiedSubscribedReadersReceiveFirstPublicationAndNeverRepublishing() {
        createOwner(); ApiClient owner = ownerClient();
        createMember("okur@example.test", "okur-parola-1234", true);
        createMember("bekleyen@example.test", "okur-parola-1234", false);
        var off = createMember("kapali@example.test", "okur-parola-1234", true);
        jdbc.sql("UPDATE user_preference SET publication_subscription = false WHERE user_id = :id")
            .param("id", off).update();
        Response live = publish(owner, "ilk-yayin");
        createMember("sonradan@example.test", "okur-parola-1234", true);
        assertThat(worker.runOnce(10)).isEqualTo(2);
        assertThat(mail.to("okur@example.test")).hasSize(1);
        assertThat(mail.to("okur@example.test").getFirst().getText()).contains("/yazilar/ilk-yayin");
        assertThat(mail.to(OWNER_EMAIL)).hasSize(1);
        assertThat(mail.to("bekleyen@example.test")).isEmpty();
        assertThat(mail.to("kapali@example.test")).isEmpty();
        assertThat(mail.to("sonradan@example.test")).isEmpty();
        live = owner.put("/api/v1/studio/articles/" + live.id(), article("Güncellenen yazı", "ilk-yayin", "Yeni sürüm."), Map.of("If-Match", live.etag()));
        Response draft = owner.command("/api/v1/studio/articles/" + live.id() + "/actions",
                Map.of("action", "save-draft"), live.etag());
        owner.command("/api/v1/studio/articles/" + draft.id() + "/actions",
                Map.of("action", "publish"), draft.etag());
        worker.runOnce(10);
        assertThat(mail.to("okur@example.test")).hasSize(1);
        assertThat(mail.to("sonradan@example.test")).isEmpty();
        assertThat(mail.to(OWNER_EMAIL)).hasSize(2);
    }

    @Test void readerOptOutIsIndependentOfAuthorPreferenceAndCheckedBeforeDelivery() {
        createOwner(); ApiClient owner = ownerClient();
        createMember("okur@example.test", "okur-parola-1234", true);
        ApiClient reader = client(); reader.login("okur@example.test", "okur-parola-1234"); reader.refreshCsrf();
        Response me = reader.get("/api/v1/me");
        assertThat(me.json().get("preferences").get("publicationSubscription").asBoolean()).isTrue();
        publish(owner, "iptal-bildirim");
        Response changed = reader.patch("/api/v1/me/preferences", Map.of("publicationSubscription", false),
                Map.of("If-Match", me.etag()));
        assertThat(changed.json().get("preferences").get("publicationSubscription").asBoolean()).isFalse();
        assertThat(changed.json().get("preferences").get("publicationEmail").asBoolean()).isTrue();
        worker.runOnce(10);
        assertThat(mail.to("okur@example.test")).isEmpty();
        reader.patch("/api/v1/me/preferences", Map.of("publicationSubscription", true),
                Map.of("If-Match", changed.etag()));
        assertThat(worker.runOnce(10)).isZero();
        assertThat(mail.to("okur@example.test")).isEmpty();
    }

    @Test void readerDeliveryRetriesWithoutResendingSuccessfulRecipients() {
        createOwner(); ApiClient owner = ownerClient();
        createMember("okur@example.test", "okur-parola-1234", true);
        publish(owner, "retry-okur");
        // The author delivery succeeds first; the reader job can retry independently.
        var readerJob = jdbc.sql("SELECT id FROM outbox_job WHERE type = 'READER_PUBLICATION_EMAIL'")
                .query(java.util.UUID.class).single();
        jdbc.sql("UPDATE outbox_job SET available_at = :later WHERE id = :id")
                .param("later", java.sql.Timestamp.from(clock.instant().plusSeconds(60)))
                .param("id", readerJob).update();
        worker.runOnce(10); assertThat(mail.to(OWNER_EMAIL)).hasSize(1);
        clock.advance(java.time.Duration.ofMinutes(2)); mail.failing(true); worker.runOnce(10);
        mail.failing(false); clock.advance(java.time.Duration.ofMinutes(2)); worker.runOnce(10);
        assertThat(mail.to(OWNER_EMAIL)).hasSize(1); assertThat(mail.to("okur@example.test")).hasSize(1);
    }
}
