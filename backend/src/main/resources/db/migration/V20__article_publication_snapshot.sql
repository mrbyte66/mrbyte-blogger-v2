-- A publication is independent of the owner's latest working revision.
CREATE TABLE article_publication (
    article_id UUID PRIMARY KEY REFERENCES article(id) ON DELETE CASCADE,
    revision_id UUID NOT NULL,
    display_date DATE NOT NULL,
    series_id UUID REFERENCES series(id),
    series_position INT,
    FOREIGN KEY (revision_id, article_id) REFERENCES article_revision(id, article_id)
);
CREATE INDEX article_publication_series_idx ON article_publication(series_id, series_position);
CREATE TABLE article_publication_category (
    article_id UUID NOT NULL REFERENCES article_publication(article_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES category(id),
    position INT NOT NULL,
    PRIMARY KEY(article_id, category_id)
);
CREATE INDEX article_publication_category_idx ON article_publication_category(category_id, article_id);
-- Only revisions that have actually been public can be used by reader annotation/history APIs.
CREATE TABLE article_published_revision (
    article_id UUID NOT NULL REFERENCES article(id) ON DELETE CASCADE,
    revision_id UUID NOT NULL,
    PRIMARY KEY(article_id, revision_id),
    FOREIGN KEY(revision_id, article_id) REFERENCES article_revision(id, article_id)
);
INSERT INTO article_publication(article_id, revision_id, display_date, series_id, series_position)
SELECT a.id, a.current_revision_id, a.display_date, c.series_id, c.position
FROM article a LEFT JOIN series_chapter c ON c.article_id = a.id
WHERE a.status = 'PUBLISHED' AND a.visibility = 'PUBLIC';
INSERT INTO article_publication_category SELECT ac.* FROM article_category ac JOIN article_publication p USING(article_id);
INSERT INTO article_published_revision SELECT article_id, revision_id FROM article_publication;
-- Preserve the source of pre-existing reader notes/history without granting access to other drafts.
INSERT INTO article_published_revision SELECT article_id, revision_id FROM annotation ON CONFLICT DO NOTHING;
INSERT INTO article_published_revision SELECT article_id, last_revision_id FROM reading_history ON CONFLICT DO NOTHING;
