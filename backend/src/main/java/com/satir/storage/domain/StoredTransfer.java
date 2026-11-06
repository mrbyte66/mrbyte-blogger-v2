package com.satir.storage.domain;

import java.time.Instant;
import java.util.UUID;

public record StoredTransfer(UUID id, UUID ownerId, String name, long sizeBytes, long uploadedBytes,
        String fingerprint, String passwordHash, String state, int retentionHours, Instant createdAt, Instant expiresAt) {
    public boolean ready() { return "READY".equals(state); }
    public boolean active(Instant now) { return expiresAt.isAfter(now); }
}
