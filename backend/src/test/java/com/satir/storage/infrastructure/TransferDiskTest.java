package com.satir.storage.infrastructure;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.*;
class TransferDiskTest {
    @TempDir Path root;
    @Test void resumeTruncatesUncommittedTailWithoutDuplicatingBytes() throws Exception {
        var disk = new TransferDisk(root.toString()); var id = UUID.randomUUID();
        disk.append(id, 0, new ByteArrayInputStream(new byte[]{1,2,3,99,99}), 5);
        disk.append(id, 3, new ByteArrayInputStream(new byte[]{4,5}), 2);
        assertThat(Files.readAllBytes(disk.path(id))).containsExactly(1,2,3,4,5);
    }
    @Test void truncatedOrOversizedNetworkInputRollsBackToCommittedOffset() throws Exception {
        var disk = new TransferDisk(root.toString()); var id = UUID.randomUUID();
        disk.append(id, 0, new ByteArrayInputStream(new byte[]{7}), 1);
        assertThatThrownBy(() -> disk.append(id, 1, new ByteArrayInputStream(new byte[]{8}), 2)).isInstanceOf(EOFException.class);
        assertThat(Files.readAllBytes(disk.path(id))).containsExactly(7);
        assertThatThrownBy(() -> disk.append(id, 1, new ByteArrayInputStream(new byte[]{8,9}), 1)).isInstanceOf(IOException.class);
        assertThat(Files.readAllBytes(disk.path(id))).containsExactly(7);
    }
    @Test void missingCommittedBytesCannotSilentlyBecomeZeros() throws Exception {
        var disk = new TransferDisk(root.toString()); var id = UUID.randomUUID();
        assertThatThrownBy(() -> disk.append(id, 100, new ByteArrayInputStream(new byte[]{1}), 1)).isInstanceOf(IOException.class);
    }
    @Test void streamsWithBoundedReadBufferAndDeletesFile() throws Exception {
        var disk = new TransferDisk(root.toString()); var id = UUID.randomUUID();
        final int[] remaining = {8 * 1024 * 1024};
        InputStream input = new InputStream() {
            public int read() { return remaining[0]-- > 0 ? 0 : -1; }
            public int read(byte[] b, int offset, int len) {
                assertThat(len).isLessThanOrEqualTo(64 * 1024);
                if (remaining[0] <= 0) return -1;
                int n = Math.min(len, remaining[0]); remaining[0] -= n; return n;
            }
        };
        disk.append(id, 0, input, 8 * 1024 * 1024);
        assertThat(disk.size(id)).isEqualTo(8 * 1024 * 1024);
        disk.delete(id); assertThat(disk.path(id)).doesNotExist();
    }
}
