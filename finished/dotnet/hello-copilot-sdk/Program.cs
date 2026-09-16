using GitHub.Copilot;
using GitHub.Copilot.Rpc;
using HelloCopilotSDK.Helpers;

#pragma warning disable GHCP001 // Custom permission decisions are evaluation-only in SDK 1.0.11.

Console.WriteLine("=== Copilot accessibility guidance ===\n");

await using var client = new CopilotClient();
await client.StartAsync();

var ping = await client.PingAsync("workshop");
Console.WriteLine($"Connected to the Copilot runtime: {ping.Message}\n");

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Streaming = true,
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("Only the permission-free accessibility lookup is allowed.")),
    Tools = [AccessibilityRuleCatalog.CreateLookupTool()],
    AvailableTools = ["accessibility_rule_lookup"]
});

Console.Write("Accessibility question: ");
var question = Console.ReadLine();
if (string.IsNullOrWhiteSpace(question))
{
    Console.Error.WriteLine("Enter a question to continue.");
    return;
}

Console.WriteLine("\nCopilot:");
await ResponseStreamer.SendAndPrintAsync(
    session,
    $"Use accessibility_rule_lookup to answer this question: {question}");
