package com.satir.platform.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PreconditionsTest {

    @Test
    void readsTheVersionFromStrongWeakAndProxyEncodedTags() {
        assertThat(Preconditions.requireVersion("\"7\"")).isEqualTo(7);
        assertThat(Preconditions.requireVersion("W/\"7\"")).isEqualTo(7);
        assertThat(Preconditions.requireVersion("\"7-zstd\"")).isEqualTo(7);
        assertThat(Preconditions.requireVersion("\"12-gzip\"")).isEqualTo(12);
        assertThat(Preconditions.requireVersion("W/\"3-br\"")).isEqualTo(3);
    }

    @Test
    void refusesMissingAndForeignTags() {
        assertThatThrownBy(() -> Preconditions.requireVersion(null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> Preconditions.requireVersion("\"7-other\"")).isInstanceOf(ApiException.class);
    }
}
