package com.satir.editorial.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Read model for the owner's writing activity. */
@Repository
public class WritingRepository {

    /** The last revision of an article saved inside the window and the last one saved before it (nullable). */
    public record TouchedDocuments(String latest, String before) {
    }

    private final JdbcClient jdbc;

    WritingRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<TouchedDocuments> touched(UUID ownerId, Instant from, Instant to) {
        return jdbc.sql("""
                SELECT r.document::text AS latest,
                       (SELECT p.document::text FROM article_revision p
                         WHERE p.article_id = r.article_id AND p.created_at < :from
                         ORDER BY p.revision_number DESC LIMIT 1) AS before
                FROM article_revision r JOIN article a ON a.id = r.article_id
                WHERE a.owner_id = :owner AND r.created_at >= :from AND r.created_at < :to
                  AND r.revision_number = (SELECT max(x.revision_number) FROM article_revision x
                                           WHERE x.article_id = r.article_id AND x.created_at >= :from AND x.created_at < :to)
                """)
                .param("owner", ownerId).param("from", Timestamp.from(from)).param("to", Timestamp.from(to))
                .query((rs, row) -> new TouchedDocuments(rs.getString("latest"), rs.getString("before"))).list();
    }
}
