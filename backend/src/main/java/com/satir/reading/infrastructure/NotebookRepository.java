package com.satir.reading.infrastructure;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class NotebookRepository {
    public record Note(UUID id, String body, String color, Instant createdAt, Instant updatedAt, long version, String audioMime, Integer audioDuration) { }
    private final JdbcClient jdbc;
    NotebookRepository(JdbcClient jdbc) { this.jdbc = jdbc; }
    public void lockOwner(UUID user) { jdbc.sql("SELECT id FROM app_user WHERE id = :user FOR UPDATE").param("user",user).query(UUID.class).single(); }
    public List<Note> list(UUID user) {
        return jdbc.sql("SELECT id,body,color,created_at,updated_at,version,audio_mime,audio_duration FROM personal_note WHERE user_id = :user ORDER BY updated_at DESC,id")
            .param("user",user).query((rs,n)->new Note(rs.getObject("id",UUID.class),rs.getString("body"),rs.getString("color"),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getLong("version"),rs.getString("audio_mime"),rs.getObject("audio_duration",Integer.class))).list();
    }
    public Optional<Note> get(UUID user, UUID id) { return list(user).stream().filter(n->n.id().equals(id)).findFirst(); }
    public void save(UUID user, UUID id, String body, String color, Instant now, boolean create) {
        if (create) jdbc.sql("INSERT INTO personal_note(user_id,id,body,color,created_at,updated_at) VALUES(:user,:id,:body,:color,:now,:now)")
            .param("user",user).param("id",id).param("body",body).param("color",color).param("now",Timestamp.from(now)).update();
        else jdbc.sql("UPDATE personal_note SET body=:body,color=:color,updated_at=:now,version=version+1 WHERE user_id=:user AND id=:id")
            .param("user",user).param("id",id).param("body",body).param("color",color).param("now",Timestamp.from(now)).update();
    }
    public void audio(UUID user,UUID id,byte[] bytes,String mime,int duration) { jdbc.sql("UPDATE personal_note SET audio_data=:data,audio_mime=:mime,audio_duration=:duration WHERE user_id=:user AND id=:id").param("user",user).param("id",id).param("data",bytes).param("mime",mime).param("duration",duration).update(); }
    public byte[] audio(UUID user,UUID id) { return jdbc.sql("SELECT audio_data FROM personal_note WHERE user_id=:user AND id=:id").param("user",user).param("id",id).query((rs,n)->rs.getBytes(1)).optional().orElse(null); }
    public long audioBytes(UUID user) { return jdbc.sql("SELECT COALESCE(sum(octet_length(audio_data)),0) FROM personal_note WHERE user_id=:user").param("user",user).query(Long.class).single(); }
    public int audioLength(UUID user,UUID id) { return jdbc.sql("SELECT COALESCE(octet_length(audio_data),0) FROM personal_note WHERE user_id=:user AND id=:id").param("user",user).param("id",id).query(Integer.class).optional().orElse(0); }
    public boolean delete(UUID user, UUID id) { return jdbc.sql("DELETE FROM personal_note WHERE user_id=:user AND id=:id").param("user",user).param("id",id).update()==1; }
}
