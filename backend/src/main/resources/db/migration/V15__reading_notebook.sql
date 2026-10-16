-- Private annotation presentation/audio plus freeform personal notes.
ALTER TABLE annotation ADD COLUMN color VARCHAR(16) NOT NULL DEFAULT 'lavender';
ALTER TABLE annotation ADD COLUMN audio_data BYTEA;
ALTER TABLE annotation ADD COLUMN audio_mime VARCHAR(40);
ALTER TABLE annotation ADD COLUMN audio_duration INTEGER;
ALTER TABLE annotation DROP CONSTRAINT annotation_kind_ck;
ALTER TABLE annotation ADD CONSTRAINT annotation_kind_ck CHECK (kind IN ('HIGHLIGHT','UNDERLINE','NOTE','AUDIO','BOOKMARK'));
ALTER TABLE annotation ADD CONSTRAINT annotation_color_ck CHECK (color IN ('lavender','mint','peach','blue','yellow'));
CREATE TABLE personal_note (
 user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 id UUID NOT NULL,
 body VARCHAR(12000) NOT NULL,
 color VARCHAR(16) NOT NULL DEFAULT 'lavender',
 created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,id),
 CONSTRAINT personal_note_color_ck CHECK (color IN ('lavender','mint','peach','blue','yellow'))
);
CREATE INDEX personal_note_updated_idx ON personal_note(user_id,updated_at DESC,id);
