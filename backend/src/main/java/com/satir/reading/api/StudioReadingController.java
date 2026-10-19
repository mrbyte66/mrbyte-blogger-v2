package com.satir.reading.api;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.satir.identity.application.SatirPrincipal;
import com.satir.reading.application.AnnotationService;

/** OWNER gate is enforced by security; the account ID still scopes every private annotation. */
@RestController
@RequestMapping("/api/v1/studio/articles/{articleId}/reading-notes")
class StudioReadingController {
    private final AnnotationService annotations;
    StudioReadingController(AnnotationService annotations) { this.annotations = annotations; }
    @GetMapping
    ResponseEntity<AnnotationService.ArticleAnnotations> list(@AuthenticationPrincipal SatirPrincipal owner,
            @PathVariable UUID articleId) {
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(annotations.preview(owner.userId(), articleId));
    }
    @GetMapping("/{markId}/audio")
    ResponseEntity<byte[]> audio(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID articleId, @PathVariable UUID markId) {
        var audio = annotations.previewAudio(owner.userId(), articleId, markId);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
                .contentType(org.springframework.http.MediaType.parseMediaType(audio.mime())).body(audio.data());
    }

}
