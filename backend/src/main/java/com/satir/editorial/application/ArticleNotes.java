package com.satir.editorial.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.domain.Block;
import com.satir.editorial.infrastructure.NoteRepository;
import com.satir.editorial.infrastructure.NoteRepository.NoteRow;
import com.satir.platform.api.ApiException;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.validation.ValidationException;

/** The owner's private notes on a writing. Notes are not content: no revision, no public surface. */
@Service
public class ArticleNotes {

    public static final int MAX_PER_ARTICLE = 200;
    public static final int MAX_BODY = 1000;

    public record NoteView(UUID id, UUID blockId, String body, boolean resolved, Instant createdAt, Instant updatedAt) {
        static NoteView of(NoteRow row) {
            return new NoteView(row.id(), row.blockId(), row.body(), row.resolved(), row.createdAt(), row.updatedAt());
        }
    }

    private final NoteRepository notes;
    private final EditorialJson json;
    private final IdGenerator ids;
    private final Clock clock;

    ArticleNotes(NoteRepository notes, EditorialJson json, IdGenerator ids, Clock clock) {
        this.notes = notes;
        this.json = json;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<NoteView> list(UUID articleId) {
        requireArticle(articleId);
        return notes.list(articleId).stream().map(NoteView::of).toList();
    }

    @Transactional
    public NoteView create(UUID ownerId, UUID articleId, UUID blockId, String body) {
        requireArticle(articleId);
        String text = body(body);
        if (blockId != null && !blockIds(articleId).contains(blockId)) {
            throw new ValidationException("blockId", "UNKNOWN");
        }
        if (notes.count(articleId) >= MAX_PER_ARTICLE) {
            throw new ApiException(HttpStatus.CONFLICT, "NOTE_LIMIT", "Bir yazıya en fazla " + MAX_PER_ARTICLE + " not eklenebilir");
        }
        UUID id = ids.next();
        notes.insert(id, articleId, blockId, text, ownerId, clock.instant());
        return NoteView.of(notes.find(articleId, id).orElseThrow());
    }

    @Transactional
    public NoteView update(UUID articleId, UUID noteId, String body, Boolean resolved) {
        NoteRow current = notes.find(articleId, noteId).orElseThrow(ArticleNotes::notFound);
        if (body == null && resolved == null) {
            throw new ValidationException("body", "REQUIRED");
        }
        notes.update(noteId, body == null ? current.body() : body(body), resolved == null ? current.resolved() : resolved,
                clock.instant());
        return NoteView.of(notes.find(articleId, noteId).orElseThrow());
    }

    @Transactional
    public void delete(UUID articleId, UUID noteId) {
        if (!notes.delete(articleId, noteId)) {
            throw notFound();
        }
    }

    private void requireArticle(UUID articleId) {
        if (!notes.articleExists(articleId)) {
            throw notFound();
        }
    }

    private Set<UUID> blockIds(UUID articleId) {
        ArticleDocument document = json.document(notes.currentDocument(articleId).orElseThrow(ArticleNotes::notFound));
        return document.blocks().stream().map(Block::id).collect(Collectors.toSet());
    }

    private static String body(String value) {
        String text = value == null ? "" : value.strip();
        if (text.isEmpty()) {
            throw new ValidationException("body", "REQUIRED");
        }
        if (text.codePointCount(0, text.length()) > MAX_BODY) {
            throw new ValidationException("body", "LENGTH");
        }
        return text;
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }
}
