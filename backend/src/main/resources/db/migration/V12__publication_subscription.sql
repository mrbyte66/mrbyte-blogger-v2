-- Reader subscriptions are independent of the author's existing notification preference.
ALTER TABLE user_preference ADD COLUMN publication_subscription BOOLEAN NOT NULL DEFAULT TRUE;
-- Preserve existing explicit opt-outs when introducing the reader preference.
UPDATE user_preference SET publication_subscription = publication_email;
