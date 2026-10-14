package com.satir.editorial;

import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.ifMatch;
import static com.satir.support.Fixtures.with;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.Fixtures;
import com.satir.support.IntegrationTest;

/** Inline marks, private notes and the daily word goal (owner-only writing aids). */
class StudioWritingToolsIntegrationTest extends IntegrationTest {

    private ApiClient owner;

    private void signIn() {
        createOwner();
        owner = ownerClient();
    }

    private static Map<String, Object> paragraph(String text, List<Map<String, Object>> marks) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("id", UUID.randomUUID().toString());
        block.put("type", "paragraph");
        block.put("text", text);
        if (marks != null) {
            block.put("marks", marks);
        }
        return block;
    }

    private static Map<String, Object> mark(String type, int start, int end, String href) {
        Map<String, Object> mark = new LinkedHashMap<>();
        mark.put("type", type);
        mark.put("start", start);
        mark.put("end", end);
        if (href != null) {
            mark.put("href", href);
        }
        return mark;
    }

    private static Map<String, Object> withBlocks(Map<String, Object> body, Map<String, Object>... blocks) {
        return with(body, "document", Map.of("schemaVersion", 1, "blocks", List.of(blocks)));
    }

    private Response create(Map<String, Object> body) {
        Response created = owner.command("/api/v1/studio/articles", body, null);
        assertThat(created.status()).as(String.valueOf(created.json())).isEqualTo(201);
        return created;
    }

    private int todaysWords() {
        Response progress = owner.get("/api/v1/studio/writing/today");
        assertThat(progress.status()).as(String.valueOf(progress.json())).isEqualTo(200);
        return progress.json().get("words").asInt();
    }

    private static String firstErrorField(Response response) {
        return response.json().get("errors").get(0).get("field").asString();
    }

    private static String firstErrorCode(Response response) {
        return response.json().get("errors").get(0).get("code").asString();
    }

    // ---------------------------------------------------------------- marks

    @Test
    @SuppressWarnings("unchecked")
    void inlineMarksSurviveTheRoundTripAndReachVisitors() {
        signIn();
        Map<String, Object> body = withBlocks(article("Biçimli", "bicimli", "x"),
                paragraph("Merhaba güzel dünya", List.of(mark("bold", 0, 7, null), mark("link", 8, 13, "https://example.org/a"),
                        mark("italic", 4, 13, null))),
                paragraph("Düz paragraf", null));
        Response created = create(body);
        JsonNodeAssert.marksOf(created, 0).hasSize(3);

        Response published = Fixtures.publish(owner, withBlocks(article("Açık", "acik", "x"),
                paragraph("Kalın kısım", List.of(mark("bold", 0, 5, null)))));
        Response visitor = client().get("/api/v1/articles/by-slug/acik");
        assertThat(visitor.status()).isEqualTo(200);
        assertThat(visitor.json().get("document").get("blocks").get(0).get("marks").get(0).get("type").asString()).isEqualTo("bold");
        assertThat(published.status()).isEqualTo(200);
        // A paragraph without marks stays without the field.
        assertThat(created.json().get("document").get("blocks").get(1).has("marks")).isFalse();
    }

    @Test
    @SuppressWarnings("unchecked")
    void invalidMarksAreRejectedWithTheFailingField() {
        signIn();
        Map<String, Object> base = article("Kötü", "kotu", "x");
        String text = "Merhaba dünya";
        Map<List<Map<String, Object>>, String> cases = new LinkedHashMap<>();
        cases.put(List.of(mark("bold", 0, 99, null)), "RANGE");
        cases.put(List.of(mark("bold", 5, 5, null)), "RANGE");
        cases.put(List.of(mark("underline", 0, 3, null)), "INVALID");
        cases.put(List.of(mark("bold", 0, 5, null), mark("bold", 3, 8, null)), "OVERLAP");
        cases.put(List.of(mark("link", 0, 5, "javascript:alert(1)")), "FORMAT");
        cases.put(List.of(mark("link", 0, 5, "//example.org")), "FORMAT");
        cases.put(List.of(mark("link", 0, 5, null)), "FORMAT");
        cases.put(List.of(mark("bold", 0, 5, "https://example.org")), "INVALID");
        cases.forEach((marks, code) -> {
            Response rejected = owner.command("/api/v1/studio/articles", withBlocks(base, paragraph(text, marks)), null);
            assertThat(rejected.status()).as(marks.toString()).isEqualTo(422);
            assertThat(firstErrorCode(rejected)).as(marks.toString()).isEqualTo(code);
            assertThat(firstErrorField(rejected)).startsWith("document.blocks[0].marks");
        });
        // Same kind may not overlap, different kinds may; relative and mailto links are fine.
        Response ok = owner.command("/api/v1/studio/articles", withBlocks(base,
                paragraph(text, List.of(mark("bold", 0, 8, null), mark("italic", 3, 12, null),
                        mark("link", 0, 3, "/yazilar/baska"), mark("link", 4, 7, "mailto:ben@example.org")))), null);
        assertThat(ok.status()).as(String.valueOf(ok.json())).isEqualTo(201);
    }

    @Test
    @SuppressWarnings("unchecked")
    void marksCannotSplitASurrogatePair() {
        signIn();
        String text = "a😀b";
        Response split = owner.command("/api/v1/studio/articles",
                withBlocks(article("Emoji", "emoji", "x"), paragraph(text, List.of(mark("bold", 2, 3, null)))), null);
        assertThat(split.status()).isEqualTo(422);
        Response whole = owner.command("/api/v1/studio/articles",
                withBlocks(article("Emoji", "emoji", "x"), paragraph(text, List.of(mark("bold", 1, 3, null)))), null);
        assertThat(whole.status()).isEqualTo(201);
    }

    // ---------------------------------------------------------------- notes

    @Test
    void privateNotesAreOwnerOnlyAndAnchorToBlocks() {
        signIn();
        Response draft = create(article("Notlu", "notlu", "Birinci paragraf.", "İkinci paragraf."));
        String path = "/api/v1/studio/articles/" + draft.id() + "/notes";
        String blockId = draft.json().get("document").get("blocks").get(1).get("id").asString();

        assertThat(owner.get(path).json().get("items")).isEmpty();

        Response whole = owner.post(path, Map.of("body", "Başlığı yeniden düşün."));
        assertThat(whole.status()).as(String.valueOf(whole.json())).isEqualTo(201);
        assertThat(whole.json().get("blockId").isNull()).isTrue();
        assertThat(whole.json().get("resolved").asBoolean()).isFalse();

        Map<String, Object> anchored = new LinkedHashMap<>();
        anchored.put("blockId", blockId);
        anchored.put("body", "  Bu cümleyi bir örnekle destekle.  ");
        Response note = owner.post(path, anchored);
        assertThat(note.status()).isEqualTo(201);
        assertThat(note.text("blockId")).isEqualTo(blockId);
        assertThat(note.text("body")).isEqualTo("Bu cümleyi bir örnekle destekle.");

        List<String> bodies = new ArrayList<>();
        owner.get(path).json().get("items").forEach(item -> bodies.add(item.get("body").asString()));
        assertThat(bodies).containsExactly("Başlığı yeniden düşün.", "Bu cümleyi bir örnekle destekle.");

        Response resolved = owner.patch(path + "/" + note.id(), Map.of("resolved", true), Map.of());
        assertThat(resolved.status()).isEqualTo(200);
        assertThat(resolved.json().get("resolved").asBoolean()).isTrue();
        Response edited = owner.patch(path + "/" + note.id(), Map.of("body", "Örnek ekledim."), Map.of());
        assertThat(edited.text("body")).isEqualTo("Örnek ekledim.");
        assertThat(edited.json().get("resolved").asBoolean()).isTrue();

        assertThat(owner.delete(path + "/" + whole.id(), null, Map.of()).status()).isEqualTo(204);
        assertThat(owner.get(path).json().get("items")).hasSize(1);
        assertThat(owner.delete(path + "/" + whole.id(), null, Map.of()).status()).isEqualTo(404);

        // Notes stay out of every public surface and out of the article itself.
        ApiClient visitor = client();
        assertThat(visitor.get(path).status()).isIn(401, 403);
        assertThat(owner.get("/api/v1/studio/articles/" + draft.id()).json().has("notes")).isFalse();
    }

    @Test
    void noteInputIsValidated() {
        signIn();
        Response draft = create(article("Doğrulama", "dogrulama", "Metin."));
        Response other = create(article("Başka", "baska", "Başka metin."));
        String path = "/api/v1/studio/articles/" + draft.id() + "/notes";

        assertThat(owner.post(path, Map.of("body", "   ")).status()).isEqualTo(422);
        assertThat(owner.post(path, Map.of("body", "x".repeat(1001))).status()).isEqualTo(422);
        Map<String, Object> unknownBlock = new LinkedHashMap<>();
        unknownBlock.put("blockId", UUID.randomUUID().toString());
        unknownBlock.put("body", "Olmayan blok");
        Response unknown = owner.post(path, unknownBlock);
        assertThat(unknown.status()).isEqualTo(422);
        assertThat(firstErrorField(unknown)).isEqualTo("blockId");

        // A block of another writing is not a valid anchor either.
        Map<String, Object> foreign = new LinkedHashMap<>();
        foreign.put("blockId", other.json().get("document").get("blocks").get(0).get("id").asString());
        foreign.put("body", "Başka yazının bloğu");
        assertThat(owner.post(path, foreign).status()).isEqualTo(422);

        assertThat(owner.get("/api/v1/studio/articles/" + UUID.randomUUID() + "/notes").status()).isEqualTo(404);
        Response created = owner.post(path, Map.of("body", "Geçerli"));
        assertThat(owner.patch("/api/v1/studio/articles/" + other.id() + "/notes/" + created.id(), Map.of("resolved", true), Map.of())
                .status()).isEqualTo(404);
        assertThat(owner.patch(path + "/" + created.id(), Map.of(), Map.of()).status()).isEqualTo(422);
    }

    @Test
    void notesSurviveRevisionsAndLimitIsEnforced() {
        signIn();
        Response draft = create(article("Revizyon", "revizyon", "Bir."));
        String blockId = draft.json().get("document").get("blocks").get(0).get("id").asString();
        String path = "/api/v1/studio/articles/" + draft.id() + "/notes";
        Map<String, Object> anchored = new LinkedHashMap<>();
        anchored.put("blockId", blockId);
        anchored.put("body", "Kalıcı not");
        assertThat(owner.post(path, anchored).status()).isEqualTo(201);

        // Saving a new revision that drops the block keeps the note (unanchored, still listed).
        Map<String, Object> rewritten = article("Revizyon", "revizyon", "Tamamen yeni metin.");
        Response saved = owner.put("/api/v1/studio/articles/" + draft.id(), rewritten, Map.of("If-Match", draft.etag()));
        assertThat(saved.status()).isEqualTo(200);
        assertThat(owner.get(path).json().get("items")).hasSize(1);

        for (int i = 1; i < 200; i++) {
            assertThat(owner.post(path, Map.of("body", "Not " + i)).status()).isEqualTo(201);
        }
        Response over = owner.post(path, Map.of("body", "Fazla"));
        assertThat(over.status()).isEqualTo(409);
        assertThat(over.code()).isEqualTo("NOTE_LIMIT");
    }

    // ---------------------------------------------------------------- daily word goal

    @Test
    void dailyGoalIsPartOfTheOwnerSettingsAndValidated() {
        signIn();
        Response settings = owner.get("/api/v1/studio/site");
        assertThat(settings.json().get("dailyWordGoal").asInt()).isEqualTo(500);

        Response changed = owner.patch("/api/v1/studio/site", Map.of("dailyWordGoal", 1200), Map.of("If-Match", settings.etag()));
        assertThat(changed.status()).as(String.valueOf(changed.json())).isEqualTo(200);
        assertThat(changed.json().get("dailyWordGoal").asInt()).isEqualTo(1200);

        Response off = owner.patch("/api/v1/studio/site", Map.of("dailyWordGoal", 0), Map.of("If-Match", changed.etag()));
        assertThat(off.json().get("dailyWordGoal").asInt()).isZero();

        Response tooBig = owner.patch("/api/v1/studio/site", Map.of("dailyWordGoal", 20001), Map.of("If-Match", off.etag()));
        assertThat(tooBig.status()).isEqualTo(422);
        assertThat(firstErrorField(tooBig)).isEqualTo("dailyWordGoal");
        assertThat(owner.patch("/api/v1/studio/site", Map.of("dailyWordGoal", -1), Map.of("If-Match", off.etag())).status())
                .isEqualTo(422);

        // The goal never leaks to visitors.
        assertThat(client().get("/api/v1/site").json().has("dailyWordGoal")).isFalse();
    }

    @Test
    void todaysWordsAreTheNetGrowthSinceThePreviousDay() {
        signIn();
        assertThat(todaysWords()).isZero();
        assertThat(client().get("/api/v1/studio/writing/today").status()).isIn(401, 403);

        Response first = create(article("Bir", "bir", "bir iki üç"));
        assertThat(todaysWords()).isEqualTo(3);

        Response grown = owner.put("/api/v1/studio/articles/" + first.id(), article("Bir", "bir", "bir iki üç dört beş"),
                Map.of("If-Match", first.etag()));
        assertThat(grown.status()).isEqualTo(200);
        assertThat(todaysWords()).isEqualTo(5);

        create(article("İki", "iki", "altı yedi sekiz dokuz"));
        assertThat(todaysWords()).isEqualTo(9);

        // Next day: counting restarts; only growth over yesterday's last revision counts.
        clock.advance(Duration.ofDays(1));
        owner = ownerClient(); // yesterday's session has expired by now
        assertThat(todaysWords()).isZero();
        Response current = owner.get("/api/v1/studio/articles/" + first.id());
        Response again = owner.put("/api/v1/studio/articles/" + first.id(),
                article("Bir", "bir", "bir iki üç dört beş altı yedi"), Map.of("If-Match", current.etag()));
        assertThat(again.status()).isEqualTo(200);
        assertThat(todaysWords()).isEqualTo(2);
        assertThat(ifMatch(0)).isEqualTo("\"0\"");
    }

    /** Small helper to keep the assertions about marks readable. */
    private static final class JsonNodeAssert {
        static org.assertj.core.api.AbstractIterableAssert<?, ? extends Iterable<? extends tools.jackson.databind.JsonNode>, tools.jackson.databind.JsonNode, ?> marksOf(
                Response response, int block) {
            return assertThat(response.json().get("document").get("blocks").get(block).get("marks"));
        }
    }
}
