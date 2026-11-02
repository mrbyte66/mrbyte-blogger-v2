package com.satir.editorial.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.satir.editorial.domain.ArticleLifecycle.Action;
import com.satir.editorial.domain.ArticleLifecycle.State;
import com.satir.editorial.domain.ArticleLifecycle.Status;
import com.satir.editorial.domain.ArticleLifecycle.Visibility;
import com.satir.platform.text.Slugs;
import com.satir.platform.validation.ValidationException;

class EditorialDomainTest {

    /** status, visibility, action → expected status/visibility, or the rejection code. */
    @ParameterizedTest(name = "{0}/{1} {2} -> {3}")
    @CsvSource({
            "DRAFT,PUBLIC,PUBLISH,PUBLISHED/PUBLIC",
            "SCHEDULED,PUBLIC,PUBLISH,PUBLISHED/PUBLIC",
            "PUBLISHED,PUBLIC,PUBLISH,same",
            "ARCHIVED,PUBLIC,PUBLISH,INVALID_TRANSITION",
            "TRASHED,PUBLIC,PUBLISH,INVALID_TRANSITION",
            "DRAFT,PRIVATE,PUBLISH,PRIVATE_NOT_PUBLISHABLE",
            "DRAFT,PRIVATE,SCHEDULE,PRIVATE_NOT_PUBLISHABLE",
            "DRAFT,PUBLIC,SCHEDULE,SCHEDULED/PUBLIC",
            "SCHEDULED,PUBLIC,SCHEDULE,SCHEDULED/PUBLIC",
            "PUBLISHED,PUBLIC,SCHEDULE,INVALID_TRANSITION",
            "SCHEDULED,PUBLIC,CANCEL_SCHEDULE,DRAFT/PUBLIC",
            "DRAFT,PUBLIC,CANCEL_SCHEDULE,same",
            "PUBLISHED,PUBLIC,CANCEL_SCHEDULE,INVALID_TRANSITION",
            "PUBLISHED,PUBLIC,SAVE_DRAFT,DRAFT/PUBLIC",
            "SCHEDULED,PUBLIC,SAVE_DRAFT,DRAFT/PUBLIC",
            "TRASHED,PUBLIC,SAVE_DRAFT,INVALID_TRANSITION",
            "PUBLISHED,PUBLIC,ARCHIVE,ARCHIVED/PUBLIC",
            "TRASHED,PUBLIC,ARCHIVE,INVALID_TRANSITION",
            "PUBLISHED,PUBLIC,TRASH,TRASHED/PUBLIC",
            "TRASHED,PUBLIC,TRASH,same",
            "TRASHED,PRIVATE,RESTORE,DRAFT/PRIVATE",
            "ARCHIVED,PUBLIC,RESTORE,DRAFT/PUBLIC",
            "PUBLISHED,PUBLIC,RESTORE,INVALID_TRANSITION",
            "PUBLISHED,PUBLIC,MAKE_PRIVATE,DRAFT/PRIVATE",
            "SCHEDULED,PUBLIC,MAKE_PRIVATE,DRAFT/PRIVATE",
            "ARCHIVED,PRIVATE,MAKE_PRIVATE,DRAFT/PRIVATE",
            "DRAFT,PRIVATE,MAKE_PRIVATE,same",
            "TRASHED,PUBLIC,MAKE_PRIVATE,INVALID_TRANSITION",
            "DRAFT,PRIVATE,PREPARE_PUBLIC,DRAFT/PUBLIC",
            "ARCHIVED,PRIVATE,PREPARE_PUBLIC,INVALID_TRANSITION",
            "PUBLISHED,PUBLIC,PREPARE_PUBLIC,same"})
    void stateMachine(Status status, Visibility visibility, Action action, String expected) {
        State state = new State(status, visibility);
        if (expected.equals("INVALID_TRANSITION") || expected.equals("PRIVATE_NOT_PUBLISHABLE")) {
            assertThatThrownBy(() -> ArticleLifecycle.apply(state, action))
                    .isInstanceOf(ArticleLifecycle.Rejected.class)
                    .extracting("code").isEqualTo(expected);
            return;
        }
        ArticleLifecycle.Transition transition = ArticleLifecycle.apply(state, action);
        if (expected.equals("same")) {
            assertThat(transition.changed()).isFalse();
            assertThat(transition.next()).isEqualTo(state);
        } else {
            String[] parts = expected.split("/");
            assertThat(transition.changed()).isTrue();
            assertThat(transition.next()).isEqualTo(new State(Status.valueOf(parts[0]), Visibility.valueOf(parts[1])));
        }
    }

    @Test
    void onlyPublishAndScheduleRequirePublishableContent() {
        for (Action action : Action.values()) {
            State draft = new State(Status.DRAFT, Visibility.PUBLIC);
            try {
                boolean required = ArticleLifecycle.apply(draft, action).requiresPublishable();
                assertThat(required).as(action.name()).isEqualTo(action == Action.PUBLISH || action == Action.SCHEDULE);
            } catch (ArticleLifecycle.Rejected ignored) {
                // not applicable from draft
            }
        }
    }

    @Test
    void wireNamesMapToActions() {
        assertThat(Action.fromWire("cancel-schedule")).isEqualTo(Action.CANCEL_SCHEDULE);
        assertThat(Action.fromWire("make-private")).isEqualTo(Action.MAKE_PRIVATE);
        assertThat(Action.fromWire("drop-table")).isNull();
    }

    @Test
    void documentValidationEnforcesBlockRules() {
        UUID a = UUID.randomUUID();
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.Paragraph(a, "x"), new Block.Paragraph(a, "y"))).validated())
                .extracting("code").isEqualTo("DUPLICATE");
        assertThatThrownBy(() -> new ArticleDocument(2, List.of()).validated()).extracting("code").isEqualTo("UNSUPPORTED");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.Heading(a, "Başlık", 4))).validated())
                .extracting("field").isEqualTo("document.blocks[0].level");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(
                new Block.Table(a, "", List.of("A", "B"), List.of(List.of("tek"))))).validated())
                .extracting("code").isEqualTo("COLUMN_COUNT");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(
                new Block.Image(a, null, "/assets/../etc/passwd", "", "", null, null))).validated())
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(
                new Block.Image(a, null, "https://evil.example/x.png", "", "", null, null))).validated())
                .extracting("code").isEqualTo("FORMAT");
        new ArticleDocument(1, List.of(new Block.Image(a, null, "/assets/thinking-loop.svg", "alt", "", 1200, 600))).validated();
    }

    @Test
    void listsCalloutsAndSourcesAreValidated() {
        UUID a = UUID.randomUUID();
        Block.Mark bold = new Block.Mark("bold", 0, 9, null);
        ArticleDocument valid = new ArticleDocument(1, List.of(
                new Block.ItemList(a, "bullet", List.of(new Block.Item("Denetimli öğrenme", List.of(bold)), new Block.Item("Pekiştirmeli"))),
                new Block.Callout(UUID.randomUUID(), "summary", "Kısaca", "Derin öğrenme bir makine öğrenmesi yöntemidir.", null)),
                List.of(new ArticleDocument.Source("AI vs ML vs DL", "All Things Open", "2025", "https://allthingsopen.org/x"),
                        new ArticleDocument.Source("Yalnız başlık", null, null, null)));
        valid.validated();
        assertThat(valid.wordCount()).isEqualTo(9);
        assertThat(valid.annotatableTexts()).hasSize(1);

        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.ItemList(a, "stars", List.of(new Block.Item("x"))))).validated())
                .extracting("field").isEqualTo("document.blocks[0].style");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.ItemList(a, "ordered", List.of()))).validated())
                .extracting("field").isEqualTo("document.blocks[0].items");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.ItemList(a, "ordered", List.of(new Block.Item("iki\nsatır"))))).validated())
                .extracting("code").isEqualTo("FORMAT");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.ItemList(a, "bullet", List.of(new Block.Item("kısa", List.of(new Block.Mark("bold", 0, 9, null))))))).validated())
                .extracting("field").isEqualTo("document.blocks[0].items[0].marks[0].end");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(new Block.Callout(a, "danger", null, "x", null))).validated())
                .extracting("field").isEqualTo("document.blocks[0].tone");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(), List.of(new ArticleDocument.Source(" ", null, null, null))).validated())
                .extracting("field").isEqualTo("document.sources[0].title");
        assertThatThrownBy(() -> new ArticleDocument(1, List.of(), List.of(new ArticleDocument.Source("x", null, null, "javascript:alert(1)"))).validated())
                .extracting("field").isEqualTo("document.sources[0].url");
    }

    @Test
    void readingTimeAndPreviewAreDerivedFromTheBody() {
        String sentence = "Bu bir cümledir ve tam olarak on kelimeden oluşuyor burada. ";
        ArticleDocument document = new ArticleDocument(1, List.of(
                new Block.Paragraph(UUID.randomUUID(), sentence.repeat(30)),
                new Block.Code(UUID.randomUUID(), "kod kod kod", "java", null)));

        assertThat(document.readingMinutes()).isEqualTo(2); // 300 words / 200 wpm, code excluded
        String preview = document.bodyPreview(200);
        assertThat(preview).endsWith(".").hasSizeGreaterThanOrEqualTo(200).hasSizeLessThan(200 + sentence.length());
        assertThat(ArticleDocument.empty().readingMinutes()).isEqualTo(1);
        assertThat(document.hasNonBlankParagraph()).isTrue();
        assertThat(new ArticleDocument(1, List.of(new Block.Paragraph(UUID.randomUUID(), "   "))).hasNonBlankParagraph()).isFalse();
    }

    @Test
    void turkishTitlesBecomeAsciiSlugs() {
        assertThat(Slugs.fromTitle("Yapay zekâ ile düşünmek")).isEqualTo("yapay-zeka-ile-dusunmek");
        assertThat(Slugs.fromTitle("İyi Kodun Sessizliği — Çağ, Şehir, Ölçü")).isEqualTo("iyi-kodun-sessizligi-cag-sehir-olcu");
        assertThat(Slugs.fromTitle("   ")).isEmpty();
        assertThat(Slugs.isValid("a--b")).isFalse();
        assertThat(Slugs.isValid("ok-123")).isTrue();
    }
}
