package workshop;

import com.github.copilot.rpc.McpStdioServerConfig;
import com.github.copilot.rpc.PermissionHandler;
import com.github.copilot.rpc.PermissionRequest;
import com.github.copilot.rpc.PermissionRequestResult;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;

public final class CuratorSafety {
    public static final List<String> WIKIPEDIA_TOOLS = List.of(
            "wikipedia-search",
            "wikipedia-readArticle");
    public static final String EXHIBIT_FILE_NAME = "exhibit.html";

    private static final Set<String> WIKIPEDIA_TOOL_NAMES = Set.of(
            "search",
            "readArticle",
            "wikipedia-search",
            "wikipedia-readArticle");
    private static final String WIKIPEDIA_REJECTION =
            "This session allows only the scoped Wikipedia search and article tools.";
    private static final String EXHIBIT_WRITE_REJECTION =
            "This session allows writing only exhibit.html in the application working directory.";
    private static final Pattern SOURCES_HEADING = Pattern.compile("(?im)^##\\s+Sources\\s*$");
    private static final Pattern SOURCE_LINE = Pattern.compile("^\\s*-\\s*(.+?):\\s*(https://\\S+)\\s*$");

    private CuratorSafety() {
    }

    public static McpStdioServerConfig wikipediaServer() {
        // SessionConfig should place this config in a map entry keyed "wikipedia".
        return new McpStdioServerConfig()
                .setCommand("npx")
                .setArgs(List.of("-y", "wikipedia-mcp@1.0.3"))
                .setWorkingDirectory(Path.of("").toAbsolutePath().normalize().toString())
                .setTools(List.of("search", "readArticle"));
    }

    public static PermissionHandler wikipediaPermissionHandler() {
        return (request, ignored) -> CompletableFuture.completedFuture(
                isAllowedWikipediaRequest(request)
                        ? PermissionRequestResult.approveOnce()
                        : PermissionRequestResult.reject(WIKIPEDIA_REJECTION));
    }

    // Parses model-written links, not evidence that an article exists or was consulted.
    public static SourceExtraction extractSources(String content) {
        if (content == null || content.isBlank()) {
            return new SourceExtraction("", List.of());
        }

        var matcher = SOURCES_HEADING.matcher(content);
        int headingStart = -1;
        int headingEnd = -1;
        while (matcher.find()) {
            headingStart = matcher.start();
            headingEnd = matcher.end();
        }
        if (headingStart < 0) {
            return new SourceExtraction(content.strip(), List.of());
        }

        String body = content.substring(0, headingStart).strip();
        String sourcesText = content.substring(headingEnd);
        List<Source> sources = new ArrayList<>();
        sourcesText.lines().forEach(line -> {
            var sourceMatcher = SOURCE_LINE.matcher(line);
            if (sourceMatcher.matches()) {
                String title = sourceMatcher.group(1).trim();
                String url = sourceMatcher.group(2).trim();
                if (!title.isEmpty() && !url.isEmpty()) {
                    sources.add(new Source(title, url));
                }
            }
        });
        return new SourceExtraction(body, sources);
    }

    public static PermissionHandler exhibitWritePermission(Path workingDirectory) {
        Path applicationDirectory = workingDirectory.toAbsolutePath().normalize();
        return (request, ignored) -> CompletableFuture.completedFuture(
                request != null
                        && "write".equals(request.getKind())
                        && !Boolean.TRUE.equals(request.getManagedApprovalRequired())
                        && isExhibitWrite(request.getExtensionData(), applicationDirectory)
                        ? PermissionRequestResult.approveOnce()
                        : PermissionRequestResult.reject(EXHIBIT_WRITE_REJECTION));
    }

    private static boolean isAllowedWikipediaRequest(PermissionRequest request) {
        if (request == null || !"mcp".equals(request.getKind()) || request.getExtensionData() == null
                || Boolean.TRUE.equals(request.getManagedApprovalRequired())) {
            return false;
        }
        Map<String, Object> details = request.getExtensionData();
        return "wikipedia".equals(details.get("serverName"))
                && details.get("toolName") instanceof String toolName
                && WIKIPEDIA_TOOL_NAMES.contains(toolName);
    }

    private static boolean isExhibitWrite(Map<String, Object> request, Path workingDirectory) {
        if (request == null || !(request.get("fileName") instanceof String fileName) || fileName.isBlank()
                || (request.containsKey("requestSandboxBypass")
                    && !Boolean.FALSE.equals(request.get("requestSandboxBypass")))) {
            return false;
        }
        try {
            Path candidate = workingDirectory.resolve(Path.of(fileName)).normalize();
            Path allowed = workingDirectory.resolve(EXHIBIT_FILE_NAME);
            return candidate.equals(allowed) && !Files.isSymbolicLink(allowed)
                    && !Files.isDirectory(allowed, LinkOption.NOFOLLOW_LINKS);
        } catch (InvalidPathException exception) {
            return false;
        }
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

    public record Source(String title, String url) {
    }

    public record SourceExtraction(String body, List<Source> sources) {
        public SourceExtraction {
            sources = List.copyOf(sources);
        }
    }
}
