package com.github.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.copilot.generated.SessionEvent;
import com.github.copilot.rpc.PermissionHandler;
import com.github.copilot.rpc.PermissionRequest;
import com.github.copilot.rpc.PermissionRequestResult;
import com.github.copilot.rpc.SessionConfig;
import workshop.ArtifactVerifier;
import workshop.CuratorFacts;
import workshop.CuratorSafety;
import workshop.CuratorStreamer;
import workshop.CuratorValidation;
import workshop.ResponseStreamer;
import workshop.WorkshopPermissionHandler;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public final class WorkshopChecks {
    private static final ObjectMapper JSON = JsonRpcClient.getObjectMapper();
    private static int checks;

    private static void check(boolean condition, String label) {
        if (!condition) {
            throw new AssertionError(label);
        }
        checks++;
    }

    @FunctionalInterface
    private interface CheckedAction {
        void run() throws Exception;
    }

    private static void rejects(CheckedAction action, String label) throws Exception {
        rejects(action, label, null);
    }

    private static void rejects(CheckedAction action, String label, String expectedMessage) throws Exception {
        try {
            action.run();
        } catch (IOException | IllegalArgumentException | IllegalStateException exception) {
            if (expectedMessage != null) {
                check(exception.getMessage().equals(expectedMessage), label + ": precise failure message");
            }
            checks++;
            return;
        }
        throw new AssertionError("Expected failure: " + label);
    }

    private static void decision(PermissionHandler handler, String json, boolean allowed) throws Exception {
        PermissionRequest request = JSON.readValue(json, PermissionRequest.class);
        String result = handler.handle(request, null).get().getKind();
        check(result.equals(allowed ? PermissionRequestResult.approveOnce().getKind()
                : PermissionRequestResult.reject("Denied").getKind()), json);
    }

    public static void main(String[] args) throws Exception {
        java.util.logging.Logger.getLogger("com.github.copilot").setLevel(java.util.logging.Level.SEVERE);
        var noTools = new SessionConfig().setAvailableTools(List.of())
                .setOnPermissionRequest((request, ignored) -> CompletableFuture.completedFuture(
                        PermissionRequestResult.reject("Unexpected permission.")));
        check(JSON.valueToTree(new SessionConfig().setAvailableTools(noTools.getAvailableTools()))
                .get("availableTools").isEmpty(), "Empty allowlist survives serialization");
        decision(noTools.getOnPermissionRequest(), "{\"kind\":\"unknown\"}", false);
        String navigation = """
                {"kind":"mcp","serverName":"playwright","toolName":"browser_navigate",
                 "args":{"url":"https://example.test/review?q=1#main"}}
                """;
        PermissionRequest deserialized = JSON.readValue(navigation, PermissionRequest.class);
        check("playwright".equals(deserialized.getExtensionData().get("serverName")),
                "SDK 1.0.11 JsonAnySetter preserves serverName");
        check(deserialized.getExtensionData().get("args") instanceof Map<?, ?>,
                "SDK 1.0.11 preserves nested args");
        check(PermissionRequest.fromJsonValue(JSON.readValue(navigation, Map.class))
                .getExtensionData().containsKey("toolName"), "Event conversion preserves fields");
        var navigate = WorkshopPermissionHandler.createForTarget(URI.create("https://example.test/review?q=1#main"));
        decision(navigate, navigation, true);
        decision(navigate, navigation.replace("browser_navigate", "playwright-browser_navigate"), true);
        for (String json : List.of(
                "null", "{}", "{\"kind\":\"unknown\"}", "{\"kind\":\"mcp\"}",
                "{\"kind\":\"mcp\",\"serverName\":\"playwright\",\"toolName\":null}",
                navigation.replace("example.test", "other.test"),
                navigation.replace("/review", "/other"), navigation.replace("?q=1", "?q=2"),
                navigation.replace("#main", "#other"), navigation.replace("playwright", "other"),
                navigation.replace("browser_navigate", "browser_evaluate"),
                navigation.replace("\"url\":", "\"other\":"),
                navigation.replace("\"kind\":\"mcp\"", "\"kind\":\"mcp\",\"managedApprovalRequired\":true"),
                navigation.replace("\"kind\":\"mcp\"", "\"kind\":\"mcp\",\"managedApprovalRequired\":{}"))) {
            decision(navigate, json, false);
        }
        var wikipedia = CuratorSafety.wikipediaPermissionHandler();
        for (String tool : List.of("search", "readArticle", "wikipedia-search", "wikipedia-readArticle")) {
            decision(wikipedia, "{\"kind\":\"mcp\",\"serverName\":\"wikipedia\",\"toolName\":\"" + tool + "\"}", true);
        }
        for (String json : List.of(
                "null", "{}", "{\"kind\":\"mcp\"}",
                "{\"kind\":\"mcp\",\"serverName\":\"other\",\"toolName\":\"search\"}",
                "{\"kind\":\"mcp\",\"serverName\":\"wikipedia\",\"toolName\":\"delete\"}",
                "{\"kind\":\"mcp\",\"serverName\":\"wikipedia\",\"toolName\":null}",
                "{\"kind\":\"mcp\",\"serverName\":\"wikipedia\",\"toolName\":\"search\",\"managedApprovalRequired\":true}")) {
            decision(wikipedia, json, false);
        }

        Path directory = Files.createTempDirectory("workshop-java-checks-");
        try {
            var write = CuratorSafety.exhibitWritePermission(directory);
            for (String name : List.of("exhibit.html", "./exhibit.html", directory.resolve("exhibit.html").toString())) {
                decision(write, JSON.writeValueAsString(Map.of("kind", "write", "fileName", name)), true);
            }
            for (String json : List.of(
                    "null", "{}", "{\"kind\":\"write\"}", "{\"kind\":\"write\",\"fileName\":null}",
                    "{\"kind\":\"write\",\"fileName\":42}", "{\"kind\":\"write\",\"fileName\":\"\"}",
                    "{\"kind\":\"write\",\"fileName\":\"bad\\u0000path\"}",
                    "{\"kind\":\"write\",\"fileName\":\"other.html\"}",
                    "{\"kind\":\"write\",\"fileName\":\"../exhibit.html\"}",
                    "{\"kind\":\"write\",\"fileName\":\"sub/exhibit.html\"}",
                    "{\"kind\":\"read\",\"fileName\":\"exhibit.html\"}",
                    "{\"kind\":\"write\",\"fileName\":\"exhibit.html\",\"managedApprovalRequired\":true}",
                    "{\"kind\":\"write\",\"fileName\":\"exhibit.html\",\"requestSandboxBypass\":true}",
                    "{\"kind\":\"write\",\"fileName\":\"exhibit.html\",\"requestSandboxBypass\":\"false\"}")) {
                decision(write, json, false);
            }
            artifactCases(directory, "accessibility-report.html",
                    ArtifactVerifier::captureArtifactState, ArtifactVerifier::verifyArtifactUpdate);
            artifactCases(directory, "exhibit.html",
                    CuratorSafety::captureArtifactState, CuratorSafety::verifyArtifactUpdate);
        } finally {
            try (var files = Files.walk(directory)) {
                for (Path path : files.sorted(Comparator.reverseOrder()).toList()) {
                    Files.delete(path);
                }
            }
        }
        check(CuratorFacts.boundFacts(Arrays.asList(" fact ", null, " ")).equals(List.of("fact")), "Fact trimming");
        check(CuratorFacts.boundFacts(java.util.Collections.nCopies(20, "x".repeat(500))).size() == 20, "Exact bounds");
        rejects(() -> CuratorFacts.boundFacts(List.of()), "Empty facts");
        rejects(() -> CuratorFacts.boundFacts(java.util.Collections.nCopies(21, "fact")), "Fact count");
        rejects(() -> CuratorFacts.boundFacts(List.of("x".repeat(501))), "Fact length");
        check(CuratorFacts.approvedFactLookup(List.of("fact")).name().equals("approved_fact_lookup"), "Fact tool");
        check(Boolean.TRUE.equals(CuratorFacts.approvedFactLookup(List.of("fact")).skipPermission()), "Permission-free fact tool");
        check(CuratorValidation.validateExhibit(exhibit(100)).valid(), "100 word narrative");
        check(CuratorValidation.validateExhibit(exhibit(140)).valid(), "140 word narrative");
        for (String text : List.of("", exhibit(99), exhibit(141), exhibit(100).replace("## Narrative", "Narrative"),
                exhibit(100).replace("3. What?", "3. What"), exhibit(100) + "\n4. Where?", exhibit(100) + "\nsoftware")) {
            check(!CuratorValidation.validateExhibit(text).valid(), "Structural rejection");
        }
        check(CuratorSafety.extractSources("notes").sources().isEmpty(), "Missing citations");
        check(CuratorSafety.extractSources("notes\n## Sources\nmalformed").sources().isEmpty(), "Malformed citations");
        check(CuratorSafety.extractSources("notes\n## Sources\n- Moon: https://en.wikipedia.org/wiki/Moon")
                .sources().size() == 1, "Model-reported citations");
        streamCases(false);
        streamCases(true);
        System.out.println("PASS: " + checks + " Java deterministic checks.");
    }

    private static String exhibit(int words) {
        return "# Exhibit\n## Narrative\n" + "history ".repeat(words)
                + "\n## Visitor questions\n1. Why?\n2. How?\n3. What?";
    }

    @FunctionalInterface
    private interface Capture<T> {
        T run(Path directory, String name) throws Exception;
    }

    @FunctionalInterface
    private interface Verify<T> {
        void run(T state) throws Exception;
    }

    private static <T> void artifactCases(Path directory, String name, Capture<T> capture, Verify<T> verify)
            throws Exception {
        Path path = directory.resolve(name);
        T absent = capture.run(directory, name);
        rejects(() -> verify.run(absent), "Absent");
        Files.writeString(path, "");
        rejects(() -> verify.run(absent), "Empty");
        T empty = capture.run(directory, name);
        Files.writeString(path, "first");
        verify.run(absent); checks++;
        verify.run(empty); checks++;
        T previous = capture.run(directory, name);
        Files.setLastModifiedTime(path, FileTime.fromMillis(System.currentTimeMillis() + 300_000));
        rejects(() -> verify.run(previous), "Same bytes, changed mtime", "No output update was verified.");
        check(Files.readString(path).equals("first"), "Preserves prior artifact");
        FileTime time = Files.getLastModifiedTime(path);
        Files.writeString(path, "other");
        Files.setLastModifiedTime(path, time);
        verify.run(previous); checks++;
        Files.delete(path);
        Files.createDirectory(path);
        rejects(() -> capture.run(directory, name), "Directory capture");
        rejects(() -> verify.run(absent), "Directory output");
        Files.delete(path);
        Path original = directory.resolve(name + ".original");
        Files.writeString(original, "preserved");
        try {
            Files.createSymbolicLink(path, original);
            rejects(() -> capture.run(directory, name), "Symlink capture");
            rejects(() -> verify.run(absent), "Symlink output");
            check(Files.readString(original).equals("preserved"), "Preserves symlink destination");
            Files.delete(path);
            Files.createSymbolicLink(path, directory.resolve("missing"));
            rejects(() -> capture.run(directory, name), "Dangling symlink");
        } catch (java.nio.file.FileSystemException exception) {
            if (!System.getProperty("os.name").startsWith("Windows")) {
                throw exception;
            }
            System.out.println("SKIP: Windows symlink privilege is unavailable: " + exception.getReason());
        } finally {
            Files.deleteIfExists(path);
            Files.delete(original);
        }
        rejects(() -> capture.run(directory, "../" + name), "Non-leaf target");
    }

    private static void streamCases(boolean museum) throws Exception {
        for (String scenario : List.of("success", "session-error", "send-error", "timeout", "send-timeout", "error-before-ack")) {
            try (var wire = new FakeWire(); var rpc = JsonRpcClient.fromStreams(wire.input, wire.output);
                    var session = new CopilotSession("offline-test", rpc)) {
                wire.replyToSend = !(scenario.equals("send-timeout") || scenario.equals("error-before-ack"));
                wire.failSend = scenario.equals("send-error");
                PrintStream original = System.out;
                var output = new ByteArrayOutputStream();
                try (var capture = new PrintStream(output, true, StandardCharsets.UTF_8)) {
                    System.setOut(capture);
                    var running = CompletableFuture.supplyAsync(() -> {
                        try {
                            if (museum) {
                                return CuratorStreamer.streamExhibit(session, "fixture", Duration.ofMillis(500));
                            }
                            ResponseStreamer.sendAndPrint(session, "fixture", Duration.ofMillis(500));
                            return "";
                        } catch (Exception exception) {
                            throw new java.util.concurrent.CompletionException(exception);
                        }
                    });
                    wire.sent.get(2, TimeUnit.SECONDS);
                    if (scenario.equals("success")) {
                        emit(session, "assistant.message_delta", Map.of("messageId", "m1", "deltaContent", "progressive"));
                        check(output.toString(StandardCharsets.UTF_8).contains("progressive") && !running.isDone(),
                                "Prints delta before idle");
                        emit(session, "assistant.message", Map.of("messageId", "m1", "content", "progressive"));
                        emit(session, "tool.execution_start", Map.of("toolName", "approved_fact_lookup", "toolCallId", "t1"));
                        emit(session, "tool.execution_complete", Map.of("success", true, "toolCallId", "t1"));
                        emit(session, "assistant.message", Map.of("messageId", "m2", "content", "final"));
                        emit(session, "session.idle", Map.of());
                        String text = running.get(2, TimeUnit.SECONDS);
                        if (museum) check(text.equals("progressivefinal"), "Retains multiple messages without duplicates");
                        String printed = output.toString(StandardCharsets.UTF_8);
                        check(printed.contains("[tool:start]") && printed.contains("[tool:done]"), "Tool activity");
                        check(printed.indexOf("progressive") == printed.lastIndexOf("progressive"), "No duplicate final");
                    } else {
                        if (scenario.equals("session-error") || scenario.equals("error-before-ack")) {
                            emit(session, "session.error", Map.of("message", "fixture failure", "errorType", "test"));
                        }
                        try {
                            running.get(2, TimeUnit.SECONDS);
                            throw new AssertionError("Expected stream failure: " + scenario);
                        } catch (ExecutionException exception) {
                            Throwable root = exception;
                            while (root.getCause() != null) root = root.getCause();
                            check(scenario.contains("timeout") ? root instanceof TimeoutException
                                    : root.getMessage().contains("fixture failure"), "Bounded " + scenario);
                        }
                    }
                    var field = CopilotSession.class.getDeclaredField("eventHandlers");
                    field.setAccessible(true);
                    check(((Collection<?>) field.get(session)).isEmpty(), "Every acquired listener released: " + scenario);
                } finally {
                    System.setOut(original);
                }
                session.close();
                check(wire.destroyed, "Session destruction is requested: " + scenario);
            }
        }
    }

    private static void emit(CopilotSession session, String type, Map<String, Object> data) {
        session.dispatchEvent(JSON.convertValue(Map.of("type", type, "data", data), SessionEvent.class));
    }

    // No process, network, authentication, or model: only framed replies to SDK RPC calls.
    private static final class FakeWire implements AutoCloseable {
        final PipedInputStream input = new PipedInputStream(65536);
        final PipedOutputStream replies;
        final CompletableFuture<Void> sent = new CompletableFuture<>();
        boolean replyToSend = true;
        boolean failSend;
        boolean destroyed;
        final OutputStream output = new ByteArrayOutputStream() {
            @Override
            public synchronized void flush() throws IOException {
                String frame = toString(StandardCharsets.UTF_8);
                int body = frame.indexOf("\r\n\r\n");
                if (body < 0) return;
                var request = JSON.readTree(frame.substring(body + 4));
                reset();
                boolean send = "session.send".equals(request.path("method").asText());
                if ("session.destroy".equals(request.path("method").asText())) destroyed = true;
                if (send) sent.complete(null);
                if (!request.has("id") || (send && !replyToSend)) return;
                Map<String, Object> response = send && failSend
                        ? Map.of("jsonrpc", "2.0", "id", request.get("id").asLong(),
                                "error", Map.of("code", -32603, "message", "fixture failure"))
                        : Map.of("jsonrpc", "2.0", "id", request.get("id").asLong(),
                                "result", Map.of("messageId", "m1"));
                byte[] payload = JSON.writeValueAsBytes(response);
                replies.write(("Content-Length: " + payload.length + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                replies.write(payload);
                replies.flush();
            }
        };

        FakeWire() throws IOException {
            replies = new PipedOutputStream(input);
        }

        @Override
        public void close() throws IOException {
            replies.close();
            input.close();
        }
    }
}
