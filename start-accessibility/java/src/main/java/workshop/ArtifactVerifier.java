package workshop;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

public final class ArtifactVerifier {
    private ArtifactVerifier() {
    }

    public static final class ArtifactState {
        private final Path path;
        private final byte[] hash;

        private ArtifactState(Path path, byte[] hash) {
            this.path = path;
            this.hash = hash;
        }
    }

    public static ArtifactState captureArtifactState(Path workingDirectory, String fileName) throws IOException {
        if (fileName == null || fileName.isBlank() || fileName.equals(".") || fileName.equals("..")
                || fileName.contains("/") || fileName.contains("\\") || Path.of(fileName).isAbsolute()) {
            throw new IllegalArgumentException("Specify a single file name in the working directory.");
        }
        if (!Files.isDirectory(workingDirectory)) {
            throw new IOException("The artifact working directory must exist.");
        }
        Path path = workingDirectory.toAbsolutePath().normalize().resolve(fileName);
        return new ArtifactState(path, readArtifactHash(path, false));
    }

    public static void verifyArtifactUpdate(ArtifactState snapshot) throws IOException {
        byte[] hash = readArtifactHash(snapshot.path, true);
        if (hash == null || Arrays.equals(hash, snapshot.hash)) {
            throw new IOException("No output update was verified.");
        }
    }

    private static byte[] readArtifactHash(Path path, boolean requireNonempty) throws IOException {
        BasicFileAttributes attributes;
        try {
            attributes = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        } catch (NoSuchFileException exception) {
            return null;
        }
        if (!attributes.isRegularFile() || attributes.isSymbolicLink()
                || (requireNonempty && attributes.size() == 0)) {
            throw new IOException("No output update was verified. The target must be a nonempty regular nonsymlink file.");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (var input = new DigestInputStream(
                    Files.newInputStream(path, StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS), digest)) {
                input.transferTo(java.io.OutputStream.nullOutputStream());
            }
            return digest.digest();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }
}
