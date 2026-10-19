ALTER TABLE annotation ADD COLUMN original_quote text NOT NULL DEFAULT '';
UPDATE annotation SET original_quote = COALESCE((
    SELECT string_agg(part->>'quote', ' ' ORDER BY ordinal)
    FROM jsonb_array_elements(fragments) WITH ORDINALITY AS entry(part, ordinal)
), '');
