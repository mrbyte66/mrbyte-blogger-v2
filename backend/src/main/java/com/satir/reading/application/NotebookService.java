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
    public record Note(UUID id, String body, String color, java.time.Instant createdAt, java.time.Instant updatedAt, long version) { }
    public record Write(String body, String color) { }
    private final NotebookRepository repository;
    private final Clock clock;
    NotebookService(NotebookRepository repository, Clock clock) { this.repository=repository; this.clock=clock; }
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
        repository.save(user,id,write.body().strip(),color,clock.instant(),create);
        return view(repository.get(user,id).orElseThrow());
    }
    @Transactional
    public void delete(UUID user, UUID id) { if(!repository.delete(user,id)) throw notFound(); }
    private static Note view(NotebookRepository.Note n) { return new Note(n.id(),n.body(),n.color(),n.createdAt(),n.updatedAt(),n.version()); }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND,"NOT_FOUND","Bulunamadı"); }
}
