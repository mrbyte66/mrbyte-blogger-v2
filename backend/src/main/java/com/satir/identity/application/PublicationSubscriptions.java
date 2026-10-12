package com.satir.identity.application;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Internal delivery audience, never exposed as a member directory. */
@Service
public class PublicationSubscriptions {
    private final JdbcClient jdbc;
    public PublicationSubscriptions(JdbcClient jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true)
    public List<UUID> subscribersExcept(UUID author) {
        return jdbc.sql("""
            SELECT u.id FROM app_user u JOIN user_preference p ON p.user_id = u.id
            WHERE u.status = 'ACTIVE' AND u.verified_at IS NOT NULL
              AND p.publication_subscription AND u.id <> :author
            ORDER BY u.id
            """).param("author", author).query(UUID.class).list();
    }
}
