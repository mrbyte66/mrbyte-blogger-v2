-- Series tags merged into the one tag system (categories, shown as "Etiket"); the free-tag column is unused.
ALTER TABLE article_revision DROP CONSTRAINT article_revision_tags_ck;
ALTER TABLE article_revision DROP COLUMN tags;
