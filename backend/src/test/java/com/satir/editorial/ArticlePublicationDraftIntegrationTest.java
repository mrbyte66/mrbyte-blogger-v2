package com.satir.editorial;

import static com.satir.support.Fixtures.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.satir.editorial.application.PublicContentQuery;
import com.satir.editorial.application.PublicationScheduler;
import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

class ArticlePublicationDraftIntegrationTest extends IntegrationTest {
    @Autowired PublicContentQuery publicContent;
    @Autowired PublicationScheduler scheduler;

    private Response act(ApiClient owner, Response current, String action) {
        Response response = owner.command("/api/v1/studio/articles/" + current.id() + "/actions", action(action), current.etag());
        assertThat(response.status()).as(response.json().toString()).isEqualTo(200);
        return response;
    }

    @Test void savesAcrossDaysWithoutChangingAnyPublishedContentThenPublishesAtomically() {
        createOwner(); var owner = ownerClient(); var visitor = client();
        var original = article("İlk başlık", "sabit-adres", "Tamamlanmış metin.");
        var live = publish(owner, original);
        String url = "/api/v1/articles/by-slug/sabit-adres";
        String oldRevision = visitor.get(url).text("revisionId");
        String oldModified = visitor.get(url).text("publicModifiedAt");
        var changed = with(with(with(article("Yarın tamamlanacak", "sabit-adres", "Yarım çalışma."),
                "categoryIds", List.of(LITERATURE)), "displayDate", "2026-12-24"),
                "seo", Map.of("title", "Taslak SEO", "indexable", false));
        clock.advance(Duration.ofHours(2));
        var saved = owner.put("/api/v1/studio/articles/" + live.id(), changed, Map.of("If-Match", live.etag()));
        assertThat(saved.status()).as(saved.json().toString()).isEqualTo(200);
        saved = act(owner, saved, "save-draft");
        assertThat(saved.json().get("hasUnpublishedChanges").asBoolean()).isTrue();
        assertThat(saved.text("publishedRevisionId")).isEqualTo(oldRevision);
        assertThat(visitor.get(url).text("title")).isEqualTo("İlk başlık");
        assertThat(visitor.get(url).text("publicModifiedAt")).isEqualTo(oldModified);
        assertThat(visitor.get(url).text("revisionId")).isEqualTo(oldRevision);
        assertThat(visitor.get(url).json().get("categories").get(0).get("id").asString()).isEqualTo(SOFTWARE);
        assertThat(visitor.get("/api/v1/articles?q=Yarım").json().get("totalElements").asLong()).isZero();
        assertThat(visitor.get("/api/v1/categories").json().get("items").toString()).doesNotContain("Edebiyat");
        assertThat(publicContent.revisionText(live.id(), UUID.fromString(saved.text("revisionId")))).isEmpty();
        assertThat(publicContent.indexableUrls()).anyMatch(item -> item.path().equals("/yazilar/sabit-adres"));
        clock.advance(Duration.ofDays(1));
        owner = ownerClient(); // A new browser session the next day reads the same persisted working draft.
        var reopened = owner.get("/api/v1/studio/articles/" + live.id());
        assertThat(reopened.text("title")).isEqualTo("Yarın tamamlanacak");
        var complete = with(changed, "title", "Tamamlandı");
        saved = owner.put("/api/v1/studio/articles/" + live.id(), complete, Map.of("If-Match", reopened.etag()));
        var published = act(owner, saved, "publish");
        assertThat(visitor.get(url).text("title")).isEqualTo("Tamamlandı");
        assertThat(visitor.get(url).json().get("categories").get(0).get("id").asString()).isEqualTo(LITERATURE);
        assertThat(visitor.get(url).text("displayDate")).isEqualTo("2026-12-24");
        assertThat(published.json().get("hasUnpublishedChanges").asBoolean()).isFalse();
        assertThat(publicContent.revisionText(live.id(), UUID.fromString(oldRevision))).isPresent();
        assertThat(publicContent.indexableUrls()).noneMatch(item -> item.path().equals("/yazilar/sabit-adres"));
        long generation = jdbc.sql("SELECT publication_generation FROM article WHERE id = :id").param("id", live.id()).query(Long.class).single();
        published = act(owner, published, "publish");
        published = act(owner, published, "save-draft");
        act(owner, published, "publish");
        assertThat(jdbc.sql("SELECT publication_generation FROM article WHERE id = :id").param("id", live.id()).query(Long.class).single()).isEqualTo(generation);
    }

    @Test void unfinishedDraftMayBeIncompleteAndArchiveRestoreDoesNotRepublishIt() {
        createOwner(); var owner = ownerClient(); var live = publish(owner, article("Tam", "tam", "Yayındaki metin."));
        var incomplete = with(article("", "tam", ""), "categoryIds", List.of());
        var saved = owner.put("/api/v1/studio/articles/" + live.id(), incomplete, Map.of("If-Match", live.etag()));
        assertThat(saved.status()).isEqualTo(200);
        assertThat(client().get("/api/v1/articles/by-slug/tam").text("title")).isEqualTo("Tam");
        assertThat(owner.command("/api/v1/studio/articles/" + live.id() + "/actions", action("publish"), saved.etag()).status()).isEqualTo(422);
        saved = act(owner, saved, "archive");
        assertThat(client().get("/api/v1/articles/by-slug/tam").status()).isEqualTo(404);
        act(owner, saved, "restore");
        assertThat(client().get("/api/v1/articles/by-slug/tam").status()).isEqualTo(404);
    }

    @Test void scheduledRevisionKeepsTheOldPublicationUntilItsDueTimeAndSlugStaysLocked() {
        createOwner(); var owner = ownerClient(); var live = publish(owner, article("Bugünkü", "takvim", "Eski metin."));
        var rejected = owner.put("/api/v1/studio/articles/" + live.id(), article("Yeni", "baska-adres", "Yeni metin."), Map.of("If-Match", live.etag()));
        assertThat(rejected.status()).isEqualTo(409);
        assertThat(rejected.code()).isEqualTo("SLUG_LOCKED");
        var saved = owner.put("/api/v1/studio/articles/" + live.id(), article("Yarınki", "takvim", "Yeni metin."), Map.of("If-Match", live.etag()));
        saved = act(owner, saved, "save-draft");
        var planned = owner.command("/api/v1/studio/articles/" + live.id() + "/actions", Map.of("action", "schedule", "scheduledAt", clock.instant().plusSeconds(3600).toString(), "timeZone", "Europe/Istanbul"), saved.etag());
        assertThat(planned.status()).as(planned.json().toString()).isEqualTo(200);
        assertThat(client().get("/api/v1/articles/by-slug/takvim").text("title")).isEqualTo("Bugünkü");
        clock.advance(Duration.ofHours(2)); scheduler.runOnce();
        assertThat(client().get("/api/v1/articles/by-slug/takvim").text("title")).isEqualTo("Yarınki");
    }
    @Test void draftCoverIsNotPublicAndTheOldCoverStaysAvailableUntilPublication() throws Exception {
        createOwner(); var owner=ownerClient(); var visitor=client();
        var image=new java.awt.image.BufferedImage(4,4,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes=new java.io.ByteArrayOutputStream(); javax.imageio.ImageIO.write(image,"png",bytes);
        String oldAsset=owner.upload("/api/v1/studio/media","old.png",bytes.toByteArray()).text("id");
        String newAsset=owner.upload("/api/v1/studio/media","new.png",bytes.toByteArray()).text("id");
        var body=with(article("Kapak", "kapak", "Yayındaki metin."),"cover",Map.of("mode","manual","assetId",oldAsset));
        var live=publish(owner,body);
        var saved=owner.put("/api/v1/studio/articles/"+live.id(),with(body,"cover",Map.of("mode","manual","assetId",newAsset)),Map.of("If-Match",live.etag()));
        assertThat(saved.status()).isEqualTo(200);
        assertThat(visitor.get("/api/v1/media/"+oldAsset).status()).isEqualTo(200);
        assertThat(visitor.get("/api/v1/media/"+newAsset).status()).isEqualTo(404);
        act(owner,saved,"publish");
        assertThat(visitor.get("/api/v1/media/"+oldAsset).status()).isEqualTo(404);
        assertThat(visitor.get("/api/v1/media/"+newAsset).status()).isEqualTo(200);
    }

    @Test void draftSeriesPlacementAndTitleStayOutOfReaderNavigationUntilPublish() {
        createOwner(); var owner=ownerClient(); var visitor=client();
        var original=article("Eski bölüm başlığı","bolum","Yayındaki bölüm.");
        var live=publish(owner,original);
        var first=owner.command("/api/v1/studio/series",series("İlk seri","ilk-seri",List.of(live.text("id")),List.of(version(live))),null);
        first=owner.command("/api/v1/studio/series/"+first.id()+"/actions",action("publish"),first.etag());
        var second=owner.command("/api/v1/studio/series",series("Yeni seri","yeni-seri",List.of(),List.of()),null);
        live=owner.get("/api/v1/studio/articles/"+live.id());
        var changed=with(with(with(original,"title","Taslak bölüm başlığı"),"seriesPlacement",Map.of("seriesId",second.text("id"))),"seriesVersions",List.of(version(first),version(second)));
        var saved=owner.put("/api/v1/studio/articles/"+live.id(),changed,Map.of("If-Match",live.etag()));
        assertThat(saved.status()).as(saved.json().toString()).isEqualTo(200);
        var before=visitor.get("/api/v1/articles/by-slug/bolum");
        assertThat(before.text("title")).isEqualTo("Eski bölüm başlığı");
        assertThat(before.json().get("series").get("slug").asString()).isEqualTo("ilk-seri");
        assertThat(visitor.get("/api/v1/series/by-slug/ilk-seri").json().get("chapters").get(0).get("title").asString()).isEqualTo("Eski bölüm başlığı");
        second=owner.get("/api/v1/studio/series/"+second.id());
        var published=owner.command("/api/v1/studio/articles/"+live.id()+"/actions",Map.of("action","publish","publishSeries",true,"seriesVersion",second.version()),saved.etag());
        assertThat(published.status()).as(published.json().toString()).isEqualTo(200);
        var after=visitor.get("/api/v1/articles/by-slug/bolum");
        assertThat(after.text("title")).isEqualTo("Taslak bölüm başlığı");
        assertThat(after.json().get("series").get("slug").asString()).isEqualTo("yeni-seri");
        assertThat(visitor.get("/api/v1/series/by-slug/ilk-seri").status()).isEqualTo(404);
    }

}
