package com.satir.storage.infrastructure;

import java.sql.Timestamp;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import com.satir.platform.api.ApiException;
import org.springframework.http.HttpStatus;
import com.satir.storage.domain.StoredTransfer;

@Repository
public class TransferRepository {
    private final JdbcClient jdbc;
    public TransferRepository(JdbcClient jdbc) { this.jdbc = jdbc; }
    public void capacityLock() { jdbc.sql("SELECT pg_advisory_xact_lock(430050)").query(rs -> { rs.next(); return 0; }); }
    public StoredTransfer find(UUID id, boolean lock) {
        return jdbc.sql("SELECT * FROM storage_file WHERE id = :id" + (lock ? " FOR UPDATE" : ""))
            .param("id", id).query(TransferRepository::map).optional().orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Dosya bulunamadı veya süresi doldu"));
    }
    public List<StoredTransfer> list() {
        return jdbc.sql("SELECT * FROM storage_file ORDER BY created_at DESC").query(TransferRepository::map).list();
    }
    public void insert(StoredTransfer f) {
        jdbc.sql("""
            INSERT INTO storage_file (id, owner_id, name, size_bytes, fingerprint, password_hash, retention_hours, created_at, expires_at)
            VALUES (:id, :owner, :name, :size, :fingerprint, :password, :hours, :created, :expires)
            """).param("id", f.id()).param("owner", f.ownerId()).param("name", f.name()).param("size", f.sizeBytes())
            .param("fingerprint", f.fingerprint()).param("password", f.passwordHash()).param("hours", f.retentionHours())
            .param("created", Timestamp.from(f.createdAt())).param("expires", Timestamp.from(f.expiresAt())).update();
    }
    public void offset(UUID id, long offset) {
        jdbc.sql("UPDATE storage_file SET uploaded_bytes = :offset WHERE id = :id").param("offset", offset).param("id", id).update();
    }
    public void complete(UUID id, Instant expiry) {
        jdbc.sql("UPDATE storage_file SET state = 'READY', expires_at = :expiry WHERE id = :id")
            .param("expiry", Timestamp.from(expiry)).param("id", id).update();
    }
    public void extend(UUID id, Instant expiry) {
        jdbc.sql("UPDATE storage_file SET expires_at = :expiry WHERE id = :id")
            .param("expiry", Timestamp.from(expiry)).param("id", id).update();
    }
    public List<UUID> expired(Instant now) {
        return jdbc.sql("SELECT id FROM storage_file WHERE expires_at <= :now ORDER BY expires_at LIMIT 100")
            .param("now", Timestamp.from(now)).query(UUID.class).list();
    }
    public void delete(UUID id) { jdbc.sql("DELETE FROM storage_file WHERE id = :id").param("id", id).update(); }
    private static StoredTransfer map(ResultSet rs, int row) throws SQLException {
        return new StoredTransfer(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("name"),
            rs.getLong("size_bytes"), rs.getLong("uploaded_bytes"), rs.getString("fingerprint"), rs.getString("password_hash"),
            rs.getString("state"), rs.getInt("retention_hours"), rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("expires_at").toInstant());
    }
}
