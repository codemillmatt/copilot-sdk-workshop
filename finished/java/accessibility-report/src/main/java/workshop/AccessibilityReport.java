package workshop;

import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.McpStdioServerConfig;
import com.github.copilot.rpc.SessionConfig;
import com.github.copilot.rpc.ToolDefinition;
import com.github.copilot.tool.Param;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

public final class AccessibilityReport {
    private static final long MAX_SNAPSHOT_BYTES = 1_000_000;

    private AccessibilityReport() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: mvn compile exec:java -Dexec.args=\"<http-or-https-url>\"");
        }
        URI target = parseTarget(args[0]);
        Path workingDirectory = Path.of("").toAbsolutePath().normalize();
        var lookup = ToolDefinition.from(
                "accessibility_rule_lookup",
                "Looks up read-only WCAG guidance maintained by this application.",
                Param.of(String.class, "query", "The accessibility issue or WCAG criterion to look up."),
                AccessibilityReport::lookupRule).skipPermission(true);
        var readSnapshot = ToolDefinition.from(
                "read_latest_accessibility_snapshot",
                "Reads the newest Playwright accessibility snapshot created during this run.",
                new SnapshotReader(workingDirectory)::read).skipPermission(true);

        var config = new SessionConfig()
                .setStreaming(true)
                .setTools(List.of(lookup, readSnapshot))
                .setAvailableTools(List.of(
                        "accessibility_rule_lookup",
                        "read_latest_accessibility_snapshot",
                        "playwright-browser_navigate"))
                .setMcpServers(Map.of("playwright", new McpStdioServerConfig()
                        .setCommand("npx")
                        .setArgs(List.of("-y", "@playwright/mcp@0.0.78", "--browser=msedge", "--output-dir", ".playwright-mcp", "--output-mode", "file"))
                        .setWorkingDirectory(workingDirectory.toString())
                        .setTools(List.of("browser_navigate"))))
                .setOnPermissionRequest(WorkshopPermissionHandler.createForTarget(target));

        try (var client = new CopilotClient()) {
            client.start().get();
            try (var session = client.createSession(config).get()) {
                ResponseStreamer.sendAndPrint(session, reportPrompt(target));
            }
        }
    }

    private static URI parseTarget(String value) throws URISyntaxException {
        String candidate = value.contains("://") ? value : "https://" + value;
        URI target = new URI(candidate);
        if (!target.isAbsolute()
                || target.getHost() == null
                || !("http".equalsIgnoreCase(target.getScheme()) || "https".equalsIgnoreCase(target.getScheme()))) {
            throw new IllegalArgumentException("Enter an absolute HTTP or HTTPS URL.");
        }
        return target;
    }

    private static String lookupRule(String query) {
        String normalized = query.trim().toLowerCase(java.util.Locale.ROOT);
        for (Rule rule : Rule.RULES) {
            if (normalized.contains(rule.criterion().toLowerCase(java.util.Locale.ROOT))
                    || normalized.contains(rule.title().toLowerCase(java.util.Locale.ROOT))
                    || rule.keywords().stream().anyMatch(normalized::contains)) {
                return rule.toJson();
            }
        }
        return """
                {"criterion":"No exact match","title":"Criterion not found","when_it_applies":"The issue is not represented in the workshop catalog.","recommendation":"Verify the evidence and consult the complete WCAG reference."}""";
    }

    private static String reportPrompt(URI target) {
        return """
                Prepare an evidence-based accessibility review of %s.
                1. Use browser_navigate to open that exact URL.
                2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
                3. Identify three to five high-confidence issues supported by the snapshot.
                4. Call accessibility_rule_lookup for each issue before recommending a fix.

                Return only this structure:
                # Accessibility review
                ## Finding 1: <short name>
                - Evidence: <specific element or page structure observed in the browser>
                - WCAG criterion: <criterion and title returned by the catalog>
                - Recommended remediation: <specific implementation change>
                Repeat the finding section as needed.
                ## Review limits
                State that this is a focused review of browser-observable evidence, not a full WCAG conformance audit.
                Do not invent evidence, report unsupported statistics, or claim the page is WCAG compliant.""".formatted(target);
    }

    private record Rule(String criterion, String title, String whenItApplies, String recommendation, List<String> keywords) {
        private static final List<Rule> RULES = List.of(
                new Rule("1.1.1", "Non-text Content", "An informative image has no useful text alternative.", "Add concise alt text that communicates the image purpose. Use alt=\"\" only for decorative images.", List.of("image", "alt text", "text alternative")),
                new Rule("1.3.1", "Info and Relationships", "Page structure or relationships are only conveyed visually.", "Use semantic landmarks and a logical heading hierarchy so structure is programmatically available.", List.of("main landmark", "heading hierarchy", "page structure", "semantic")),
                new Rule("1.4.3", "Contrast (Minimum)", "Text does not have enough contrast against its background.", "Provide at least 4.5:1 contrast for normal text and 3:1 for large text.", List.of("contrast", "low contrast", "color")),
                new Rule("2.4.7", "Focus Visible", "Keyboard focus cannot be seen clearly.", "Keep a visible, high-contrast focus indicator on every interactive element.", List.of("focus", "keyboard", "outline")),
                new Rule("3.3.2", "Labels or Instructions", "A form does not provide a persistent visible label or necessary instructions.", "Provide visible labels and instructions that explain the expected input.", List.of("visible label", "instructions", "required field", "input format")),
                new Rule("4.1.2", "Name, Role, Value", "A form control has no programmatically determinable accessible name.", "Associate a visible <label> with the input by using matching for and id values.", List.of("accessible name", "programmatic label", "unlabeled input", "name role value")));

        private String toJson() {
            return "{\"criterion\":\"%s\",\"title\":\"%s\",\"when_it_applies\":\"%s\",\"recommendation\":\"%s\"}"
                    .formatted(criterion, title, whenItApplies, recommendation.replace("\"", "\\\""));
        }
    }

    private static final class SnapshotReader {
        private final Path outputDirectory;
        private final Set<Path> existing;

        private SnapshotReader(Path workingDirectory) throws IOException {
            outputDirectory = workingDirectory.resolve(".playwright-mcp").normalize();
            existing = new HashSet<>();
            if (Files.isDirectory(outputDirectory, LinkOption.NOFOLLOW_LINKS)) {
                try (Stream<Path> paths = Files.list(outputDirectory)) {
                    paths.filter(SnapshotReader::isSnapshotName).forEach(existing::add);
                }
            }
        }

        private String read() {
            try (Stream<Path> paths = Files.list(outputDirectory)) {
                Path newest = paths
                        .filter(path -> !existing.contains(path))
                        .filter(SnapshotReader::isSnapshotName)
                        .filter(path -> !Files.isSymbolicLink(path))
                        .filter(path -> isSafeSnapshot(path))
                        .max(Comparator.comparing(this::modifiedTime))
                        .orElseThrow(() -> new IllegalStateException(
                                "No current-run Playwright snapshot is available. Call browser_navigate first."));
                return Files.readString(newest, StandardCharsets.UTF_8);
            } catch (IOException exception) {
                throw new IllegalStateException("No current-run Playwright snapshot is available. Call browser_navigate first.", exception);
            }
        }

        private static boolean isSnapshotName(Path path) {
            String name = path.getFileName().toString();
            return name.startsWith("page-") && name.endsWith(".yml");
        }

        private static boolean isSafeSnapshot(Path path) {
            try {
                BasicFileAttributes attributes = Files.readAttributes(
                        path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
                return attributes.isRegularFile()
                        && !attributes.isSymbolicLink()
                        && attributes.size() > 0
                        && attributes.size() <= MAX_SNAPSHOT_BYTES;
            } catch (IOException exception) {
                return false;
            }
        }

        private java.nio.file.attribute.FileTime modifiedTime(Path path) {
            try {
                return Files.getLastModifiedTime(path, LinkOption.NOFOLLOW_LINKS);
            } catch (IOException exception) {
                return java.nio.file.attribute.FileTime.fromMillis(0);
            }
        }
    }
}
