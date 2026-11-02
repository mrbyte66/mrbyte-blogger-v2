package com.satir.editorial.domain;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Article body blocks (API contract §2). Plain text only — no HTML, scripts or iframes; the
 * frontend escapes everything. IDs are stable across revisions so private annotations can anchor.
 * Paragraphs, quotes, list items and callouts may carry separate inline {@link Mark}s instead of markup inside the text.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = Block.Paragraph.class, name = "paragraph"),
        @JsonSubTypes.Type(value = Block.Heading.class, name = "heading"),
        @JsonSubTypes.Type(value = Block.Quote.class, name = "quote"),
        @JsonSubTypes.Type(value = Block.Code.class, name = "code"),
        @JsonSubTypes.Type(value = Block.Image.class, name = "image"),
        @JsonSubTypes.Type(value = Block.Table.class, name = "table"),
        @JsonSubTypes.Type(value = Block.ItemList.class, name = "list"),
        @JsonSubTypes.Type(value = Block.Callout.class, name = "callout")})
@JsonInclude(JsonInclude.Include.NON_NULL)
public sealed interface Block {

    UUID id();

    record Paragraph(UUID id, String text, List<Mark> marks) implements Block {
        public Paragraph(UUID id, String text) {
            this(id, text, null);
        }
    }

    record Heading(UUID id, String text, Integer level) implements Block {
    }

    record Quote(UUID id, String text, String attribution, List<Mark> marks) implements Block {
        public Quote(UUID id, String text, String attribution) {
            this(id, text, attribution, null);
        }
    }

    /**
     * Inline formatting over a block's plain text ({@code bold}, {@code italic}, {@code strike}, {@code highlight}, {@code code}, {@code link}).
     * Offsets are UTF-16 code units of {@code text}, so reader annotations keep anchoring to the same text.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Mark(String type, int start, int end, String href) {
    }

    record Code(UUID id, String text, String language, String caption) implements Block {
    }

    /**
     * Either an uploaded media asset ({@code assetId}) or a trusted static site asset shipped with
     * the frontend deployment ({@code staticPath} under {@code /assets/}). Never a free external URL.
     */
    record Image(UUID id, UUID assetId, String staticPath, String alt, String caption, Integer width, Integer height)
            implements Block {
    }

    record Table(UUID id, String caption, List<String> columns, List<List<String>> rows) implements Block {
    }

    /** A bulleted ({@code bullet}) or numbered ({@code ordered}) list; each item is one line of plain text. */
    record ItemList(UUID id, String style, List<Item> items) implements Block {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Item(String text, List<Mark> marks) {
        public Item(String text) {
            this(text, null);
        }
    }

    /** A highlighted aside for skimming readers: {@code note}, {@code tip}, {@code warning} or {@code summary}. */
    record Callout(UUID id, String tone, String title, String text, List<Mark> marks) implements Block {
    }
}
