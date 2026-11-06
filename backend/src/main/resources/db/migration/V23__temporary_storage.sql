CREATE TABLE storage_file (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES app_user(id),
    name VARCHAR(240) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 50000000000),
    uploaded_bytes BIGINT NOT NULL DEFAULT 0 CHECK (uploaded_bytes >= 0 AND uploaded_bytes <= size_bytes),
    fingerprint VARCHAR(64) NOT NULL,
    password_hash TEXT,
    state VARCHAR(16) NOT NULL DEFAULT 'UPLOADING' CHECK (state IN ('UPLOADING', 'READY')),
    retention_hours INTEGER NOT NULL CHECK (retention_hours BETWEEN 1 AND 720),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX storage_file_expiry ON storage_file(expires_at);
