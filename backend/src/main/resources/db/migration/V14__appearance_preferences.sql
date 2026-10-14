-- Appearance that follows the account across browsers: colour mode, motion and the Studio view.
-- NULL means "not chosen": each browser keeps its own value until the person picks one.
ALTER TABLE user_preference
    ADD COLUMN color_mode  VARCHAR(16),
    ADD COLUMN motion      BOOLEAN,
    ADD COLUMN studio_view VARCHAR(16),
    ADD CONSTRAINT user_preference_color_mode_ck CHECK (color_mode IN ('light', 'dark', 'reading')),
    ADD CONSTRAINT user_preference_studio_view_ck CHECK (studio_view IN ('marjinalya', 'odak', 'kontakt', 'sahne'));
