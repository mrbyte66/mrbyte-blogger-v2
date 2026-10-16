package com.satir.reading.application;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.validation.ValidationException;
import com.satir.reading.infrastructure.NotebookRepository;


@Service
public class NotebookService {
    public record Note(UUID id, String body, String color, java.time.Instant createdAt, java.time.Instant updatedAt, long version, AnnotationService.AudioInfo audio) { }
    public record Write(String body, String color, AnnotationService.AudioInput audio) { }
    private final NotebookRepository repository;
    private final Clock clock;
    private final com.satir.reading.infrastructure.ReadingRepository annotations;
    NotebookService(NotebookRepository repository, Clock clock, com.satir.reading.infrastructure.ReadingRepository annotations) { this.repository=repository; this.clock=clock; this.annotations=annotations; }
    @Transactional(readOnly=true)
    public List<Note> list(UUID user) { return repository.list(user).stream().map(NotebookService::view).toList(); }
    @Transactional
    public Note put(UUID user, UUID id, String match, String none, Write write) {
        if(write.body()==null || write.body().isBlank() || write.body().length()>12000) throw new ValidationException("body","LENGTH");
        String color=AnnotationService.validColor(write.color());
        repository.lockOwner(user);
        var existing=repository.get(user,id);
        boolean create="*".equals(none);
        if(create) {
            if(existing.isPresent()) throw Preconditions.stale();
            if(repository.list(user).size()>=500) throw new ApiException(HttpStatus.CONFLICT,"NOTE_LIMIT","Defterinde en fazla 500 not saklayabilirsin");
        } else {
            long expected=Preconditions.requireVersion(match);
            Preconditions.check(expected,existing.orElseThrow(NotebookService::notFound).version());
        }
        byte[] audio=AnnotationService.audioBytes(write.audio());
        if(audio!=null && repository.audioBytes(user)+annotations.audioBytes(user)-repository.audioLength(user,id)+audio.length>25_000_000) throw new ApiException(HttpStatus.CONFLICT,"AUDIO_LIMIT","Ses alanın doldu. Eski ses notlarını silebilirsin.");
        repository.save(user,id,write.body().strip(),color,clock.instant(),create);
        if(audio!=null) repository.audio(user,id,audio,write.audio().mime(),write.audio().durationMs());
        return view(repository.get(user,id).orElseThrow());
    }
    @Transactional
    public void delete(UUID user, UUID id) { if(!repository.delete(user,id)) throw notFound(); }
    @Transactional(readOnly=true)
    public AnnotationService.AudioContent audio(UUID user,UUID id) { var note=repository.get(user,id).filter(n->n.audioMime()!=null).orElseThrow(NotebookService::notFound);return new AnnotationService.AudioContent(repository.audio(user,id),note.audioMime()); }
    private static Note view(NotebookRepository.Note n) { return new Note(n.id(),n.body(),n.color(),n.createdAt(),n.updatedAt(),n.version(),n.audioMime()==null?null:new AnnotationService.AudioInfo(n.audioMime(),n.audioDuration())); }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND,"NOT_FOUND","Bulunamadı"); }
}
