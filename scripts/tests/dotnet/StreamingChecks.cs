using System.IO.Pipes;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using GitHub.Copilot;
using HelloCopilotSDK.Helpers;
using Microsoft.Extensions.Logging.Abstractions;
using MuseumExhibitStudio.Helpers;

internal static class StreamingChecks
{
    private const BindingFlags Internal = BindingFlags.Instance | BindingFlags.NonPublic;

    public static async Task<int> RunAsync()
    {
        var checks = 0;
        foreach (var museum in new[] { false, true })
            foreach (var scenario in new[] { "success", "session-error", "send-error", "timeout", "send-timeout", "error-before-ack" })
            {
                using var wire = new FakeWire(scenario);
                var rpcType = typeof(CopilotSession).Assembly.GetType("GitHub.Copilot.JsonRpc", throwOnError: true)!;
                using var rpc = (IDisposable)Activator.CreateInstance(rpcType,
                    [wire, wire.Input, new JsonSerializerOptions(JsonSerializerDefaults.Web)
                {
                    TypeInfoResolver = new DefaultJsonTypeInfoResolver()
                }, NullLogger.Instance])!;
                rpcType.GetMethod("StartListening")!.Invoke(rpc, null);
                await using var client = new CopilotClient();
                await using var session = (CopilotSession)Activator.CreateInstance(
                    typeof(CopilotSession), Internal, null, ["offline-test", rpc, NullLogger.Instance, client, null], null)!;
                typeof(CopilotSession).GetMethod("StartProcessingEvents", Internal)!.Invoke(session, null);
                var original = Console.Out;
                using var output = new StringWriter();
                Console.SetOut(TextWriter.Synchronized(output));
                try
                {
                    var timeout = TimeSpan.FromMilliseconds(500);
                    var run = museum
                        ? CuratorStreamer.StreamExhibitAsync(session, "fixture", timeout)
                        : PrintAsync(session, timeout);
                    await wire.Sent.Task.WaitAsync(TimeSpan.FromSeconds(2));
                    if (scenario == "success")
                    {
                        Emit(session, "assistant.message_delta", new { messageId = "m1", deltaContent = "progressive" });
                        await WaitUntilAsync(() => output.ToString().Contains("progressive"));
                        Require(!run.IsCompleted, "Delta must print before idle"); checks++;
                        Emit(session, "assistant.message", new { messageId = "m1", content = "progressive" });
                        Emit(session, "tool.execution_start", new { toolName = "approved_fact_lookup", toolCallId = "t1" });
                        Emit(session, "tool.execution_complete", new { success = true, toolCallId = "t1" });
                        Emit(session, "assistant.message", new { messageId = "m2", content = "final" });
                        Emit(session, "session.idle", new { });
                        var content = await run.WaitAsync(TimeSpan.FromSeconds(2));
                        if (museum) { Require(content == "progressivefinal", "Retain multiple messages"); checks++; }
                        var printed = output.ToString();
                        Require(printed.Contains("[tool:start]") && printed.Contains("[tool:done]"), "Tool activity"); checks++;
                        Require(printed.IndexOf("progressive", StringComparison.Ordinal) ==
                                printed.LastIndexOf("progressive", StringComparison.Ordinal), "No duplicate final text"); checks++;
                    }
                    else
                    {
                        if (scenario is "session-error" or "error-before-ack")
                        {
                            Emit(session, "session.error", new { message = "fixture failure", errorType = "test" });
                        }
                        try
                        {
                            await run.WaitAsync(TimeSpan.FromSeconds(2));
                            throw new InvalidOperationException("Expected stream failure: " + scenario);
                        }
                        catch (Exception exception) when (
                            scenario.Contains("timeout", StringComparison.Ordinal)
                                ? exception is TimeoutException
                                : exception.Message.Contains("fixture failure", StringComparison.Ordinal))
                        {
                            checks++;
                        }
                    }
                    var handlers = typeof(CopilotSession).GetField("_eventHandlers", Internal)!.GetValue(session)!;
                    Require((int)handlers.GetType().GetProperty("Length")!.GetValue(handlers)! == 0,
                        "Every acquired subscription released: " + scenario);
                    checks++;
                }
                finally
                {
                    Console.SetOut(original);
                }
                await session.DisposeAsync();
                Require(wire.Destroyed, "Session destruction is requested: " + scenario);
                checks++;
            }
        return checks;
    }

    private static async Task<string> PrintAsync(CopilotSession session, TimeSpan timeout)
    {
        await ResponseStreamer.SendAndPrintAsync(session, "fixture", timeout);
        return "";
    }

    private static void Emit(CopilotSession session, string type, object data)
    {
        var json = JsonSerializer.Serialize(new
        {
            type,
            id = Guid.NewGuid().ToString(),
            timestamp = DateTimeOffset.UtcNow,
            parentId = (string?)null,
            data
        });
        var evt = JsonSerializer.Deserialize<SessionEvent>(json)!;
        typeof(CopilotSession).GetMethod("DispatchEvent", Internal)!.Invoke(session, [evt]);
    }

    private static async Task WaitUntilAsync(Func<bool> predicate)
    {
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(2));
        while (!predicate()) await Task.Delay(5, deadline.Token);
    }

    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }

    // Framed in-memory RPC responses only: no CLI, authentication, network, or model.
    private sealed class FakeWire : MemoryStream
    {
        private readonly AnonymousPipeServerStream replies = new(PipeDirection.Out);
        private readonly string scenario;
        public AnonymousPipeClientStream Input { get; }
        public TaskCompletionSource Sent { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public bool Destroyed { get; private set; }

        public FakeWire(string scenario)
        {
            this.scenario = scenario;
            Input = new AnonymousPipeClientStream(PipeDirection.In, replies.ClientSafePipeHandle);
        }

        public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
        {
            var frame = Encoding.UTF8.GetString(buffer.Span);
            var body = frame.IndexOf("\r\n\r\n", StringComparison.Ordinal);
            using var document = JsonDocument.Parse(frame[(body + 4)..]);
            var request = document.RootElement;
            var send = request.GetProperty("method").GetString() == "session.send";
            if (request.GetProperty("method").GetString() == "session.destroy") Destroyed = true;
            if (send) Sent.TrySetResult();
            if (!request.TryGetProperty("id", out var id) ||
                (send && scenario is "send-timeout" or "error-before-ack")) return;
            var payload = send && scenario == "send-error"
                ? JsonSerializer.SerializeToUtf8Bytes(new
                {
                    jsonrpc = "2.0",
                    id,
                    error = new { code = -32603, message = "fixture failure" }
                })
                : JsonSerializer.SerializeToUtf8Bytes(new { jsonrpc = "2.0", id, result = new { messageId = "m1" } });
            await replies.WriteAsync(Encoding.ASCII.GetBytes($"Content-Length: {payload.Length}\r\n\r\n"), cancellationToken);
            await replies.WriteAsync(payload, cancellationToken);
            await replies.FlushAsync(cancellationToken);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                replies.Dispose();
                Input.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
