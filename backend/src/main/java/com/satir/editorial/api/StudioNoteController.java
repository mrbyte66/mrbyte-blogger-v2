package com.satir.editorial.api;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.satir.editorial.application.ArticleNotes;
import com.satir.editorial.application.ArticleNotes.NoteView;
import com.satir.identity.application.SatirPrincipal;

/** Owner-only private notes on a writing. Security config restricts /studio/** to OWNER. */
@RestController
@RequestMapping("/api/v1/studio/articles/{articleId}/notes")
class StudioNoteController {

    record NoteWrite(UUID blockId, String body) {
    }

    record NotePatch(String body, Boolean resolved) {
    }

    private final ArticleNotes notes;

    StudioNoteController(ArticleNotes notes) {
        this.notes = notes;
    }

    @GetMapping
    Map<String, List<NoteView>> list(@PathVariable UUID articleId) {
        return Map.of("items", notes.list(articleId));
    }

    @PostMapping
    ResponseEntity<NoteView> create(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID articleId,
            @RequestBody NoteWrite body) {
        NoteView created = notes.create(owner.userId(), articleId, body.blockId(), body.body());
        return ResponseEntity.created(URI.create("/api/v1/studio/articles/" + articleId + "/notes/" + created.id()))
                .body(created);
    }

    @PatchMapping("/{noteId}")
    NoteView update(@PathVariable UUID articleId, @PathVariable UUID noteId, @RequestBody NotePatch body) {
        return notes.update(articleId, noteId, body.body(), body.resolved());
    }

    @DeleteMapping("/{noteId}")
    ResponseEntity<Void> delete(@PathVariable UUID articleId, @PathVariable UUID noteId) {
        notes.delete(articleId, noteId);
        return ResponseEntity.noContent().build();
    }
}
