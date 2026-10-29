package com.satir.editorial.application;

import java.util.List;

import org.springframework.stereotype.Component;

import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.domain.EditorialValues.ArticlePresentation;
import com.satir.editorial.domain.EditorialValues.Seo;
import com.satir.editorial.domain.EditorialValues.SeriesPresentation;

import tools.jackson.databind.json.JsonMapper;

/** JSONB (de)serialization for editorial documents. */
@Component
public class EditorialJson {

    private final JsonMapper json;

    EditorialJson(JsonMapper json) {
        this.json = json;
    }

    public String write(Object value) {
        return json.writeValueAsString(value);
    }

    public ArticleDocument document(String raw) {
        return json.readValue(raw, ArticleDocument.class);
    }

    public ArticlePresentation articlePresentation(String raw) {
        return json.readValue(raw, ArticlePresentation.class);
    }

    public SeriesPresentation seriesPresentation(String raw) {
        return json.readValue(raw, SeriesPresentation.class);
    }

    public Seo seo(String raw) {
        return json.readValue(raw, Seo.class);
    }

    public List<String> tags(String raw) {
        return raw == null ? List.of() : List.of(json.readValue(raw, String[].class));
    }
}
