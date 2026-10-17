package com.satir.reading.application;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.EditorialViews.RevisionText;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.validation.ValidationException;
import com.satir.reading.domain.Annotation;
import com.satir.reading.domain.Annotation.Fragment;
import com.satir.reading.domain.Annotation.Kind;
import com.satir.reading.infrastructure.ReadingRepository;
import com.satir.reading.infrastructure.ReadingRepository.AnnotationRow;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Private notes, highlights and underlines (API contract §5). Only the signed-in account's own
 * marks are ever read or written. Marks on articles that are no longer public stay stored but are
 * returned as opaque "unavailable" IDs without quotes, notes or titles.
 */
@Service
public class AnnotationService {

    public record AnnotationView(UUID id, String kind, UUID revisionId, List<Fragment> fragments, String note,
            Instant createdAt, long version, String color, AudioInfo audio, boolean emphasized) {
    }

    public record Unavailable(UUID id, boolean available) {
    }

    /** {@code items} holds {@link AnnotationView}s, or {@link Unavailable}s when the article is hidden. */
    public record ArticleAnnotations(UUID articleId, Boolean available, UUID revisionId, List<?> items) {
    }

    public record AudioInput(String data, String mime, int durationMs) { }
    public record AudioInfo(String mime, int durationMs) { }
    public record AudioContent(byte[] data, String mime) { }
    public record Write(String kind, UUID revisionId, List<Fragment> fragments, String note, String color, AudioInput audio, Boolean emphasized) {
    }

    public record Saved(AnnotationView annotation, boolean created) {
    }

    public record ImportItem(UUID articleId, UUID revisionId, String kind, List<Fragment> fragments, String note,
            Instant createdAt, String color, Boolean emphasized) {
    }

    public record ImportReport(UUID clientImportId, List<Accepted> accepted, List<Rejected> rejected) {
    }

    public record Accepted(int index, UUID id, UUID articleId) {
    }

    public record Rejected(int index, String code) {
    }

    public static final int MAX_IMPORT_ITEMS = 200;
    private static final TypeReference<List<Fragment>> FRAGMENTS = new TypeReference<>() {
    };

    private final ReadingRepository repository;
    private final PublicContentQuery content;
    private final JsonMapper json;
    private final IdGenerator ids;
    private final Clock clock;
    private final com.satir.reading.infrastructure.NotebookRepository notebook;

    AnnotationService(ReadingRepository repository, PublicContentQuery content, JsonMapper json, IdGenerator ids, Clock clock, com.satir.reading.infrastructure.NotebookRepository notebook) {
        this.repository = repository;
        this.content = content;
        this.json = json;
        this.ids = ids;
        this.clock = clock;
        this.notebook = notebook;
    }

    @Transactional(readOnly = true)
    public ArticleAnnotations list(UUID userId, UUID articleId) {
        List<AnnotationRow> rows = repository.annotations(userId, articleId);
        Optional<UUID> current = content.currentPublicRevision(articleId);
        if (current.isEmpty()) {
            return new ArticleAnnotations(articleId, false, null,
                    rows.stream().map(row -> new Unavailable(row.id(), false)).toList());
        }
        return new ArticleAnnotations(articleId, null, current.get(), rows.stream().map(this::view).toList());
    }

    /**
     * Create ({@code If-None-Match: *}) or update ({@code If-Match}). The quote of every fragment is
     * verified against the anchored revision of a public article.
     */
    @Transactional
    public Saved put(UUID userId, UUID articleId, UUID markId, String ifMatch, String ifNoneMatch, Write write) {
        repository.lockOwner(userId);
        boolean create = ifNoneMatch != null && "*".equals(ifNoneMatch.strip());
        if (!create && (ifMatch == null || ifMatch.isBlank())) {
            Preconditions.requireVersion(ifMatch);
        }
        Kind kind = Annotation.kind(write.kind());
        String note = write.note() == null ? "" : write.note();
        RevisionText text = anchoredText(articleId, write.revisionId());
        Annotation.validate(kind, write.fragments(), note, text.anchors());
        String color = validColor(write.color());
        byte[] audio = audioBytes(write.audio());
        if (kind != Kind.AUDIO && write.audio() != null) throw new ValidationException("audio", "INVALID");
        if (audio != null && repository.audioBytes(userId) + notebook.audioBytes(userId) - repository.audioLength(userId, markId) + audio.length > 25_000_000) {
            throw new ApiException(HttpStatus.CONFLICT, "AUDIO_LIMIT", "Sesli not alanın doldu; bir kaydı silip tekrar dene");
        }
        Instant now = clock.instant();
        String fragments = json.writeValueAsString(write.fragments());
        Optional<AnnotationRow> existing = repository.lockAnnotation(userId, markId);
        if (kind == Kind.AUDIO && audio == null && (existing.isEmpty() || existing.get().audioMime() == null))
            throw new ValidationException("audio", "REQUIRED");
        if (kind == Kind.BOOKMARK) repository.removeOtherBookmarks(userId, articleId, markId);
        if (create) {
            if (existing.isPresent()) {
                throw new ApiException(HttpStatus.PRECONDITION_FAILED, "ALREADY_EXISTS", "Bu işaret zaten kayıtlı; sayfayı yenile");
            }
            if (repository.countAnnotations(userId, articleId) >= Annotation.MAX_PER_ARTICLE) {
                throw new ApiException(HttpStatus.CONFLICT, "ANNOTATION_LIMIT", "Bu yazıya en fazla 200 işaret eklenebilir");
            }
            if (!repository.insertAnnotation(new ReadingRepository.NewAnnotation(userId, markId, articleId, text.revisionId(),
                    kind.name(), fragments, note, null, now, now))) {
                throw new ApiException(HttpStatus.PRECONDITION_FAILED, "ALREADY_EXISTS", "Bu işaret zaten kayıtlı; sayfayı yenile");
            }
        } else {
            AnnotationRow row = existing.filter(r -> r.articleId().equals(articleId)).orElseThrow(AnnotationService::notFound);
            Preconditions.check(Preconditions.requireVersion(ifMatch), row.version());
            repository.updateAnnotation(userId, markId, text.revisionId(), kind.name(), fragments, note, now);
        }
        repository.presentation(userId, markId, color, audio, write.audio() == null ? null : write.audio().mime(),
                write.audio() == null ? null : write.audio().durationMs());
        if(write.emphasized()!=null)repository.emphasized(userId,markId,write.emphasized());
        AnnotationRow saved = repository.lockAnnotation(userId, markId).orElseThrow();
        return new Saved(view(saved), create);
    }

    @Transactional
    public void delete(UUID userId, UUID articleId, UUID markId) {
        if (!repository.deleteAnnotation(userId, articleId, markId)) {
            throw notFound();
        }
    }

    /**
     * Imports guest (browser-local) marks after the member explicitly chose to. The same
     * {@code clientImportId} returns the stored report; a different body under it is a conflict.
     * Invalid items are reported individually and never block the valid ones.
     */
    @Transactional
    public ImportReport importMarks(UUID userId, UUID clientImportId, List<ImportItem> items) {
        if (clientImportId == null) {
            throw new ValidationException("clientImportId", "REQUIRED");
        }
        if (items == null || items.isEmpty() || items.size() > MAX_IMPORT_ITEMS) {
            throw new ValidationException("items", items == null || items.isEmpty() ? "REQUIRED" : "LENGTH");
        }
        repository.lockOwner(userId);
        String hash = sha256(json.writeValueAsString(items));
        Optional<ReadingRepository.StoredImport> stored = repository.lockImport(userId, clientImportId);
        if (stored.isPresent()) {
            if (!stored.get().requestHash().equals(hash)) {
                throw new ApiException(HttpStatus.CONFLICT, "IMPORT_ID_REUSED", "Bu içe aktarma kimliği farklı verilerle kullanıldı");
            }
            return json.readValue(stored.get().reportJson(), ImportReport.class);
        }
        Instant now = clock.instant();
        List<Accepted> accepted = new ArrayList<>();
        List<Rejected> rejected = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            ImportItem item = items.get(i);
            Optional<String> problem = importOne(userId, clientImportId, i, item, now, accepted);
            if (problem.isPresent()) {
                rejected.add(new Rejected(i, problem.get()));
            }
        }
        ImportReport report = new ImportReport(clientImportId, accepted, rejected);
        repository.insertImport(userId, clientImportId, hash, json.writeValueAsString(report), now);
        return report;
    }

    private Optional<String> importOne(UUID userId, UUID clientImportId, int index, ImportItem item, Instant now,
            List<Accepted> accepted) {
        if (item == null || item.articleId() == null || item.revisionId() == null) {
            return Optional.of("INVALID");
        }
        Optional<RevisionText> text = content.revisionText(item.articleId(), item.revisionId());
        if (text.isEmpty()) {
            return Optional.of("NOT_AVAILABLE");
        }
        Kind kind;
        String note = item.note() == null ? "" : item.note();
        try {
            kind = Annotation.kind(item.kind());
            if (kind == Kind.AUDIO) return Optional.of("AUDIO_REQUIRES_UPLOAD");
            validColor(item.color());
            Annotation.validate(kind, item.fragments(), note, text.get().anchors());
        } catch (ValidationException invalid) {
            return Optional.of(invalid.code());
        }
        if (repository.countAnnotations(userId, item.articleId()) >= Annotation.MAX_PER_ARTICLE) {
            return Optional.of("ANNOTATION_LIMIT");
        }
        Instant createdAt = item.createdAt() == null || item.createdAt().isAfter(now) ? now : item.createdAt();
        UUID id = ids.next();
        boolean inserted = repository.insertAnnotation(new ReadingRepository.NewAnnotation(userId, id, item.articleId(),
                item.revisionId(), kind.name(), json.writeValueAsString(item.fragments()), note,
                clientImportId + ":" + index, createdAt, now));
        if (!inserted) {
            return Optional.of("DUPLICATE");
        }
        if (kind == Kind.BOOKMARK) repository.removeOtherBookmarks(userId, item.articleId(), id);
        repository.presentation(userId, id, validColor(item.color()), null, null, null);
        if(item.emphasized()!=null)repository.emphasized(userId,id,item.emphasized());
        accepted.add(new Accepted(index, id, item.articleId()));
        return Optional.empty();
    }

    private RevisionText anchoredText(UUID articleId, UUID revisionId) {
        if (revisionId == null) {
            throw new ValidationException("revisionId", "REQUIRED");
        }
        if (content.currentPublicRevision(articleId).isEmpty()) {
            throw notFound();
        }
        return content.revisionText(articleId, revisionId)
                .orElseThrow(() -> new ValidationException("revisionId", "UNKNOWN_REVISION"));
    }

    private AnnotationView view(AnnotationRow row) {
        return new AnnotationView(row.id(), row.kind().toLowerCase(Locale.ROOT), row.revisionId(),
                json.readValue(row.fragmentsJson(), FRAGMENTS), row.note(), row.createdAt(), row.version(), row.color(),
                row.audioMime() == null ? null : new AudioInfo(row.audioMime(), row.audioDuration()),row.emphasized());
    }

    public static String validColor(String color) {
        if (color == null) return "lavender";
        if (!List.of("lavender", "mint", "peach", "blue", "yellow").contains(color)) throw new ValidationException("color", "INVALID");
        return color;
    }

    static byte[] audioBytes(AudioInput audio) {
        if (audio == null) return null;
        if (audio.data() == null || audio.data().length() > 1_400_000 || audio.durationMs() < 1 || audio.durationMs() > 120_000
                || audio.mime() == null || !List.of("audio/webm", "audio/ogg", "audio/mp4").contains(audio.mime())) throw new ValidationException("audio", "INVALID");
        byte[] bytes;
        try { bytes = java.util.Base64.getDecoder().decode(audio.data()); }
        catch (IllegalArgumentException e) { throw new ValidationException("audio", "FORMAT"); }
        if (bytes.length < 12 || bytes.length > 1_000_000) throw new ValidationException("audio", "LENGTH");
        boolean valid = switch (audio.mime()) {
            case "audio/webm" -> (bytes[0] & 255) == 0x1a && (bytes[1] & 255) == 0x45 && (bytes[2] & 255) == 0xdf && (bytes[3] & 255) == 0xa3;
            case "audio/ogg" -> bytes[0]=='O' && bytes[1]=='g' && bytes[2]=='g' && bytes[3]=='S';
            case "audio/mp4" -> bytes[4]=='f' && bytes[5]=='t' && bytes[6]=='y' && bytes[7]=='p';
            default -> false;
        };
        if (!valid) throw new ValidationException("audio", "FORMAT");
        return bytes;
    }

    @Transactional
    public AudioContent audio(UUID userId, UUID articleId, UUID id) {
        AnnotationRow row = repository.lockAnnotation(userId, id).filter(r -> r.articleId().equals(articleId) && r.audioMime() != null).orElseThrow(AnnotationService::notFound);
        if (content.currentPublicRevision(articleId).isEmpty()) throw notFound();
        return new AudioContent(repository.audio(userId, id), row.audioMime());
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
