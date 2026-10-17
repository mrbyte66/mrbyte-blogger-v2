package com.satir.reading.infrastructure;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
public class NotebookRepository {
    public record Note(UUID id, String body, String color, Instant createdAt, Instant updatedAt, long version, String title, List<String> tags) { }
    public record Recording(UUID id,String mime,int durationMs,int position) { }
    private final JdbcClient jdbc;
    private final JsonMapper json;
    NotebookRepository(JdbcClient jdbc,JsonMapper json) { this.jdbc=jdbc;this.json=json; }
    public void lockOwner(UUID user) { jdbc.sql("SELECT id FROM app_user WHERE id=:user FOR UPDATE").param("user",user).query(UUID.class).single(); }
    public List<Note> list(UUID user) {
        return jdbc.sql("SELECT id,body,color,created_at,updated_at,version,title,tags::text FROM personal_note WHERE user_id=:user ORDER BY updated_at DESC,id")
            .param("user",user).query((rs,n)->new Note(rs.getObject("id",UUID.class),rs.getString("body"),rs.getString("color"),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getLong("version"),rs.getString("title"),List.of(json.readValue(rs.getString("tags"),String[].class)))).list();
    }
    public Optional<Note> get(UUID user,UUID id) { return list(user).stream().filter(n->n.id().equals(id)).findFirst(); }
    public void save(UUID user,UUID id,String body,String color,String title,List<String> tags,Instant now,boolean create) {
        String sql=create?"INSERT INTO personal_note(user_id,id,body,color,title,tags,created_at,updated_at) VALUES(:user,:id,:body,:color,:title,CAST(:tags AS jsonb),:now,:now)":"UPDATE personal_note SET body=:body,color=:color,title=:title,tags=CAST(:tags AS jsonb),updated_at=:now,version=version+1 WHERE user_id=:user AND id=:id";
        jdbc.sql(sql).param("user",user).param("id",id).param("body",body).param("color",color).param("title",title).param("tags",json.writeValueAsString(tags)).param("now",Timestamp.from(now)).update();
    }
    public List<Recording> recordings(UUID user,UUID note) { return jdbc.sql("SELECT id,mime,duration_ms,position FROM personal_note_recording WHERE user_id=:user AND note_id=:note ORDER BY position,id").param("user",user).param("note",note).query((rs,n)->new Recording(rs.getObject("id",UUID.class),rs.getString("mime"),rs.getInt("duration_ms"),rs.getInt("position"))).list(); }
    public void recording(UUID user,UUID note,UUID id,byte[] bytes,String mime,int duration,int position) { jdbc.sql("INSERT INTO personal_note_recording(user_id,note_id,id,audio_data,mime,duration_ms,position) VALUES(:user,:note,:id,:data,:mime,:duration,:position) ON CONFLICT(user_id,note_id,id) DO UPDATE SET audio_data=:data,mime=:mime,duration_ms=:duration,position=:position").param("user",user).param("note",note).param("id",id).param("data",bytes).param("mime",mime).param("duration",duration).param("position",position).update(); }
    public void position(UUID user,UUID note,UUID id,int position) { jdbc.sql("UPDATE personal_note_recording SET position=:position WHERE user_id=:user AND note_id=:note AND id=:id").param("user",user).param("note",note).param("id",id).param("position",position).update(); }
    public void retain(UUID user,UUID note,List<UUID> ids) { var q=jdbc.sql("DELETE FROM personal_note_recording WHERE user_id=:user AND note_id=:note"+(ids.isEmpty()?"":" AND id NOT IN (:ids)")).param("user",user).param("note",note);if(!ids.isEmpty())q.param("ids",ids);q.update(); }
    public byte[] audio(UUID user,UUID note,UUID recording) { return jdbc.sql("SELECT audio_data FROM personal_note_recording WHERE user_id=:user AND note_id=:note AND id=:id").param("user",user).param("note",note).param("id",recording).query((rs,n)->rs.getBytes(1)).optional().orElse(null); }
    public long audioBytes(UUID user) { return jdbc.sql("SELECT COALESCE(sum(octet_length(audio_data)),0) FROM personal_note_recording WHERE user_id=:user").param("user",user).query(Long.class).single(); }
    public long audioLength(UUID user,UUID note) { return jdbc.sql("SELECT COALESCE(sum(octet_length(audio_data)),0) FROM personal_note_recording WHERE user_id=:user AND note_id=:note").param("user",user).param("note",note).query(Long.class).single(); }
    public long recordingLength(UUID user,UUID note,UUID recording) { return jdbc.sql("SELECT COALESCE(octet_length(audio_data),0) FROM personal_note_recording WHERE user_id=:user AND note_id=:note AND id=:id").param("user",user).param("note",note).param("id",recording).query(Long.class).optional().orElse(0L); }
    public boolean delete(UUID user,UUID id) { return jdbc.sql("DELETE FROM personal_note WHERE user_id=:user AND id=:id").param("user",user).param("id",id).update()==1; }
}
