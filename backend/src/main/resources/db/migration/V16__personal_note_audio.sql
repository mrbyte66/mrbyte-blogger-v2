-- Serbest Not recordings remain private and cascade with their owner/note.
ALTER TABLE personal_note ADD COLUMN audio_data BYTEA;
ALTER TABLE personal_note ADD COLUMN audio_mime VARCHAR(40);
ALTER TABLE personal_note ADD COLUMN audio_duration INTEGER;
