package com.satir.editorial.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Owner-only private notes on writings (never part of a revision). */
@Repository
public class NoteRepository {

    public record NoteRow(UUID id, UUID articleId, UUID blockId, String body, boolean resolved, Instant createdAt, Instant updatedAt) {
    }

    private static final String COLUMNS = "id, article_id, block_id, body, resolved, created_at, updated_at";

    private final JdbcClient jdbc;

    NoteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public boolean articleExists(UUID articleId) {
        return jdbc.sql("SELECT count(*) FROM article WHERE id = :id").param("id", articleId).query(Long.class).single() > 0;
    }

    /** JSON of the document in the article's current revision. */
    public Optional<String> currentDocument(UUID articleId) {
        return jdbc.sql("""
                SELECT r.document::text FROM article a JOIN article_revision r ON r.id = a.current_revision_id
                WHERE a.id = :id
                """).param("id", articleId).query(String.class).optional();
    }

    public List<NoteRow> list(UUID articleId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM article_note WHERE article_id = :article ORDER BY seq")
                .param("article", articleId).query(NoteRepository::map).list();
    }

    public long count(UUID articleId) {
        return jdbc.sql("SELECT count(*) FROM article_note WHERE article_id = :article").param("article", articleId)
                .query(Long.class).single();
    }

    public Optional<NoteRow> find(UUID articleId, UUID noteId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM article_note WHERE article_id = :article AND id = :id")
                .param("article", articleId).param("id", noteId).query(NoteRepository::map).optional();
    }

    public void insert(UUID id, UUID articleId, UUID blockId, String body, UUID createdBy, Instant now) {
        jdbc.sql("""
                INSERT INTO article_note (id, article_id, block_id, body, resolved, created_by, created_at, updated_at)
                VALUES (:id, :article, :block, :body, FALSE, :by, :now, :now)
                """)
                .param("id", id).param("article", articleId).param("block", blockId).param("body", body)
                .param("by", createdBy).param("now", Timestamp.from(now)).update();
    }

    public void update(UUID noteId, String body, boolean resolved, Instant now) {
        jdbc.sql("UPDATE article_note SET body = :body, resolved = :resolved, updated_at = :now WHERE id = :id")
                .param("id", noteId).param("body", body).param("resolved", resolved).param("now", Timestamp.from(now)).update();
    }

    public boolean delete(UUID articleId, UUID noteId) {
        return jdbc.sql("DELETE FROM article_note WHERE article_id = :article AND id = :id")
                .param("article", articleId).param("id", noteId).update() > 0;
    }

    private static NoteRow map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new NoteRow(rs.getObject("id", UUID.class), rs.getObject("article_id", UUID.class),
                rs.getObject("block_id", UUID.class), rs.getString("body"), rs.getBoolean("resolved"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
}
