package com.satir.reading.api;

import java.util.UUID;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.Preconditions;
import com.satir.reading.application.NotebookService;
import com.satir.reading.application.NotebookService.Note;

@RestController
@RequestMapping("/api/v1/me/notes")
class NotebookController {
    private final NotebookService service;
    NotebookController(NotebookService service) { this.service=service; }
    @GetMapping
    Map<String,List<Note>> list(@AuthenticationPrincipal SatirPrincipal principal) { return Map.of("items",service.list(principal.userId())); }
    @PutMapping("/{id}")
    ResponseEntity<Note> put(@AuthenticationPrincipal SatirPrincipal principal,@PathVariable UUID id,
        @RequestHeader(value="If-Match",required=false) String match,@RequestHeader(value="If-None-Match",required=false) String none,
        @RequestBody NotebookService.Write body) {
        Note note=service.put(principal.userId(),id,match,none,body);
        return ResponseEntity.status("*".equals(none)?201:200).eTag(Preconditions.etag(note.version())).body(note);
    }
    @GetMapping("/{id}/audio")
    ResponseEntity<byte[]> audio(@AuthenticationPrincipal SatirPrincipal principal,@PathVariable UUID id) { var audio=service.audio(principal.userId(),id); return ResponseEntity.ok().header("Cache-Control","private, no-store").header("X-Content-Type-Options","nosniff").contentType(org.springframework.http.MediaType.parseMediaType(audio.mime())).body(audio.data()); }
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal SatirPrincipal principal,@PathVariable UUID id) { service.delete(principal.userId(),id); return ResponseEntity.noContent().build(); }
}
