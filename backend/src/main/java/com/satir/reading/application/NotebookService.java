package com.satir.reading.application;

import java.time.Clock;
import java.util.List;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.validation.ValidationException;
import com.satir.reading.infrastructure.NotebookRepository;
import com.satir.reading.infrastructure.ReadingRepository;

@Service
public class NotebookService {
    public record Recording(UUID id,String mime,int durationMs) { }
    public record RecordingWrite(UUID id,AnnotationService.AudioInput audio) { }
    public record Note(UUID id,String body,String color,java.time.Instant createdAt,java.time.Instant updatedAt,long version,AnnotationService.AudioInfo audio,String title,List<String> tags,List<Recording> recordings) { }
    public record Write(String body,String color,AnnotationService.AudioInput audio,String title,List<String> tags,List<RecordingWrite> recordings) { }
    private final NotebookRepository repository;
    private final Clock clock;
    private final ReadingRepository annotations;
    NotebookService(NotebookRepository repository,Clock clock,ReadingRepository annotations) { this.repository=repository;this.clock=clock;this.annotations=annotations; }
    @Transactional(readOnly=true)
    public List<Note> list(UUID user) { return repository.list(user).stream().map(n->view(user,n)).toList(); }
    @Transactional
    public Note put(UUID user,UUID id,String match,String none,Write write) {
        if(write.body()==null||write.body().isBlank()||write.body().length()>12000)throw new ValidationException("body","LENGTH");
        String color=AnnotationService.validColor(write.color());repository.lockOwner(user);
        var existing=repository.get(user,id);boolean create="*".equals(none);
        if(create){if(existing.isPresent())throw Preconditions.stale();if(repository.list(user).size()>=500)throw new ApiException(HttpStatus.CONFLICT,"NOTE_LIMIT","Defterinde en fazla 500 not saklayabilirsin");}
        else Preconditions.check(Preconditions.requireVersion(match),existing.orElseThrow(NotebookService::notFound).version());
        String title=write.title()==null?existing.map(NotebookRepository.Note::title).orElse(""):write.title().strip();
        if(title.length()>160)throw new ValidationException("title","LENGTH");
        List<String> tags=write.tags()==null?existing.map(NotebookRepository.Note::tags).orElse(List.of()):validTags(write.tags());
        var old=repository.recordings(user,id);List<RecordingWrite> requested=write.recordings();
        if(requested!=null&&write.audio()!=null)throw new ValidationException("audio","INVALID");
        if(requested==null&&write.audio()!=null){requested=new ArrayList<>();for(var item:old)requested.add(new RecordingWrite(item.id(),null));final var legacyId=id;requested.removeIf(r->r.id().equals(legacyId));requested.add(new RecordingWrite(id,write.audio()));}
        record Change(UUID id,byte[] bytes,String mime,int duration,int position) { }
        List<Change> changes=new ArrayList<>();long bytes=0;
        if(requested!=null){
            if(requested.size()>10)throw new ValidationException("recordings","LENGTH");
            var ids=new HashSet<UUID>();
            for(int i=0;i<requested.size();i++){var item=requested.get(i);if(item==null||item.id()==null||!ids.add(item.id()))throw new ValidationException("recordings","INVALID");
                byte[] data=AnnotationService.audioBytes(item.audio());
                if(data==null){var previous=old.stream().filter(r->r.id().equals(item.id())).findFirst().orElseThrow(NotebookService::notFound);bytes+=repository.recordingLength(user,id,item.id());changes.add(new Change(item.id(),null,previous.mime(),previous.durationMs(),i));}
                else{bytes+=data.length;changes.add(new Change(item.id(),data,item.audio().mime(),item.audio().durationMs(),i));}
            }
            if(repository.audioBytes(user)+annotations.audioBytes(user)-repository.audioLength(user,id)+bytes>25_000_000)throw new ApiException(HttpStatus.CONFLICT,"AUDIO_LIMIT","Ses alanın doldu. Eski ses notlarını silebilirsin.");
        }
        repository.save(user,id,write.body().strip(),color,title,tags,clock.instant(),create);
        if(requested!=null){repository.retain(user,id,changes.stream().map(Change::id).toList());for(var change:changes){if(change.bytes()!=null)repository.recording(user,id,change.id(),change.bytes(),change.mime(),change.duration(),change.position());else repository.position(user,id,change.id(),change.position());}}
        return view(user,repository.get(user,id).orElseThrow());
    }
    @Transactional
    public void delete(UUID user,UUID id) { repository.lockOwner(user);if(!repository.delete(user,id))throw notFound(); }
    @Transactional(readOnly=true)
    public AnnotationService.AudioContent audio(UUID user,UUID id){var first=repository.recordings(user,id).stream().findFirst().orElseThrow(NotebookService::notFound);return audio(user,id,first.id());}
    @Transactional(readOnly=true)
    public AnnotationService.AudioContent audio(UUID user,UUID id,UUID clip){var entry=repository.recordings(user,id).stream().filter(r->r.id().equals(clip)).findFirst().orElseThrow(NotebookService::notFound);return new AnnotationService.AudioContent(repository.audio(user,id,clip),entry.mime());}
    private Note view(UUID user,NotebookRepository.Note n){var clips=repository.recordings(user,n.id()).stream().map(r->new Recording(r.id(),r.mime(),r.durationMs())).toList();return new Note(n.id(),n.body(),n.color(),n.createdAt(),n.updatedAt(),n.version(),clips.isEmpty()?null:new AnnotationService.AudioInfo(clips.getFirst().mime(),clips.getFirst().durationMs()),n.title(),n.tags(),clips);}
    private static List<String> validTags(List<String> values){if(values.size()>12)throw new ValidationException("tags","LENGTH");var result=new ArrayList<String>();for(String value:values){if(value==null)throw new ValidationException("tags","INVALID");String tag=value.strip().replaceFirst("^#","").toLowerCase(java.util.Locale.forLanguageTag("tr"));if(!tag.matches("[\\p{L}\\p{N}_-]{1,32}"))throw new ValidationException("tags","FORMAT");if(!result.contains(tag))result.add(tag);}return List.copyOf(result);}
    private static ApiException notFound(){return new ApiException(HttpStatus.NOT_FOUND,"NOT_FOUND","Bulunamadı");}
}
