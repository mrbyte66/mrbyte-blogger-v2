package com.satir.storage.infrastructure;

import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** One private file per transfer; chunk retries truncate any bytes from an uncommitted write. */
@Component
public class TransferDisk {
    private final Path root;
    public TransferDisk(@Value("${satir.storage.root}") String root) throws IOException {
        this.root = Path.of(root).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }
    public Path path(UUID id) { return root.resolve(id.toString()); }
    public long free() {
        try { return Files.getFileStore(root).getUsableSpace(); }
        catch (IOException e) { throw new UncheckedIOException(e); }
    }
    public void append(UUID id, long offset, InputStream input, long length) throws IOException {
        try (RandomAccessFile output = new RandomAccessFile(path(id).toFile(), "rw")) {
            if (output.length() < offset) throw new IOException("Stored transfer is incomplete");
            output.setLength(offset);
            output.seek(offset);
            byte[] buffer = new byte[64 * 1024];
            long remaining = length;
            try {
                while (remaining > 0) {
                    int count = input.read(buffer, 0, (int) Math.min(remaining, buffer.length));
                    if (count < 0) throw new EOFException("Incomplete chunk");
                    output.write(buffer, 0, count); remaining -= count;
                }
                if (input.read() != -1) throw new IOException("Oversized chunk");
                output.getChannel().force(true);
            } catch (IOException e) { output.setLength(offset); throw e; }
        }
    }
    public long size(UUID id) throws IOException { return Files.size(path(id)); }
    public void delete(UUID id) throws IOException { Files.deleteIfExists(path(id)); }
}
