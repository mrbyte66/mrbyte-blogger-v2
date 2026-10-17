ALTER TABLE personal_note ADD COLUMN title VARCHAR(160) NOT NULL DEFAULT '';
ALTER TABLE personal_note ADD COLUMN tags JSONB NOT NULL DEFAULT '[]';
CREATE TABLE personal_note_recording (
 user_id UUID NOT NULL,
 note_id UUID NOT NULL,
 id UUID NOT NULL,
 audio_data BYTEA NOT NULL,
 mime VARCHAR(40) NOT NULL,
 duration_ms INTEGER NOT NULL CHECK(duration_ms BETWEEN 1 AND 120000),
 position INTEGER NOT NULL,
 PRIMARY KEY(user_id,note_id,id),
 FOREIGN KEY(user_id,note_id) REFERENCES personal_note(user_id,id) ON DELETE CASCADE,
 CHECK(octet_length(audio_data) BETWEEN 12 AND 1000000)
);
INSERT INTO personal_note_recording(user_id,note_id,id,audio_data,mime,duration_ms,position)
 SELECT user_id,id,id,audio_data,audio_mime,audio_duration,0 FROM personal_note WHERE audio_data IS NOT NULL;
-- Keep the old columns for compatibility; blobs now have a single private storage location.
UPDATE personal_note SET audio_data=NULL;

ALTER TABLE annotation ADD COLUMN emphasized BOOLEAN NOT NULL DEFAULT true;
