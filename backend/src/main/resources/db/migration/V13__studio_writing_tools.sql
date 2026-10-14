-- Owner-only writing aids: private notes on writings and a daily word goal (0 turns the goal off).
ALTER TABLE site_settings ADD COLUMN daily_word_goal INT NOT NULL DEFAULT 500;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_word_goal_ck CHECK (daily_word_goal BETWEEN 0 AND 20000);

-- Notes are never part of a revision, never public. block_id is a stable block ID of the document
-- (NULL = the whole writing); a note whose block was removed later simply stays unanchored.
CREATE TABLE article_note (
    id         UUID          PRIMARY KEY,
    seq        BIGINT        GENERATED ALWAYS AS IDENTITY,
    article_id UUID          NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    block_id   UUID,
    body       VARCHAR(1000) NOT NULL,
    resolved   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_by UUID          NOT NULL REFERENCES app_user (id),
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL,
    CONSTRAINT article_note_body_ck CHECK (length(btrim(body)) > 0)
);
CREATE INDEX article_note_article_idx ON article_note (article_id, seq);
