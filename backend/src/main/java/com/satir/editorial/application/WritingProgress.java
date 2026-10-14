package com.satir.editorial.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.infrastructure.WritingRepository;
import com.satir.editorial.infrastructure.WritingRepository.TouchedDocuments;

/**
 * Words the owner added today (site time zone). Per writing it is the growth between the last saved
 * revision before today and the last one today; shrinking an old text never takes progress away.
 */
@Service
public class WritingProgress {

    public record Today(LocalDate date, long words) {
    }

    private final WritingRepository writing;
    private final EditorialJson json;
    private final Clock clock;
    private final ZoneId siteZone;

    WritingProgress(WritingRepository writing, EditorialJson json, Clock clock, @Value("${satir.site.time-zone}") String siteZone) {
        this.writing = writing;
        this.json = json;
        this.clock = clock;
        this.siteZone = ZoneId.of(siteZone);
    }

    @Transactional(readOnly = true)
    public Today today(UUID ownerId) {
        LocalDate day = clock.instant().atZone(siteZone).toLocalDate();
        Instant from = day.atStartOfDay(siteZone).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(siteZone).toInstant();
        long words = 0;
        for (TouchedDocuments pair : writing.touched(ownerId, from, to)) {
            long after = json.document(pair.latest()).wordCount();
            long before = pair.before() == null ? 0 : json.document(pair.before()).wordCount();
            words += Math.max(0, after - before);
        }
        return new Today(day, words);
    }
}
