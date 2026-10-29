-- Free-form tags of an article revision. They filter chapters inside the article's own series only;
-- global categories stay the site-wide topics. Part of the revision, so drafts never leak to readers.
ALTER TABLE article_revision ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE article_revision ADD CONSTRAINT article_revision_tags_ck CHECK (jsonb_typeof(tags) = 'array');
