ALTER TABLE annotation ADD COLUMN anchor_mode varchar(8) NOT NULL DEFAULT 'follow'
    CHECK (anchor_mode IN ('follow', 'exact'));
