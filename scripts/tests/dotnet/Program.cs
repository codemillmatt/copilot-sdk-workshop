using System.Text.Json;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;
using HelloCopilotSDK.Helpers;
using MuseumExhibitStudio.Helpers;

#pragma warning disable GHCP001

var checks = 0;
void Check(bool condition, string label)
{
    if (!condition) throw new InvalidOperationException(label);
    checks++;
}

void Rejects(Action action, string label, string? expectedMessage = null)
{
    try { action(); }
    catch (Exception error) when (error is ArgumentException or InvalidOperationException or IOException or JsonException)
    {
        if (expectedMessage is not null)
        {
            Check(error.Message == expectedMessage, label + ": precise failure message");
        }
        checks++;
        return;
    }
    throw new InvalidOperationException($"Expected failure: {label}");
}

var noTools = new SessionConfig
{
    AvailableTools = [],
    OnPermissionRequest = (_, _) => Task.FromResult(PermissionDecision.Reject("Unexpected permission."))
};
var configJson = JsonSerializer.SerializeToElement(
    new SessionConfig { AvailableTools = noTools.AvailableTools },
    new JsonSerializerOptions(JsonSerializerDefaults.Web));
Check(configJson.GetProperty("availableTools").GetArrayLength() == 0, "Explicit empty allowlist survives serialization");
Check((await noTools.OnPermissionRequest(new PermissionRequest { Kind = "unknown" }, null!)).Kind
      == PermissionDecision.Reject().Kind, "Initial denial callback");

async Task Decision(
    Func<PermissionRequest, PermissionInvocation, Task<PermissionDecision>> handler,
    string json, bool allowed)
{
    // Supply required descriptive metadata; leave every policy-relevant field under test untouched.
    json = json.Replace("\"kind\":\"mcp\"", "\"kind\":\"mcp\",\"readOnly\":true,\"toolTitle\":\"fixture\"")
        .Replace("\"kind\":\"write\"", "\"kind\":\"write\",\"diff\":\"\",\"intention\":\"fixture\",\"canOfferSessionApproval\":false");
    PermissionRequest? request;
    try { request = JsonSerializer.Deserialize<PermissionRequest>(json); }
    catch (JsonException) when (!allowed) { checks++; return; }
    var result = await handler(request!, null!);
    Check(result.Kind == (allowed ? PermissionDecision.ApproveOnce().Kind : PermissionDecision.Reject().Kind), json);
}

var target = new Uri("https://example.test/review?q=1#main");
Rejects(() => JsonSerializer.Deserialize<PermissionRequest>("""{"kind":"mcp","serverName":"playwright","toolName":"browser_navigate"}"""),
    "Missing required protocol metadata");
var navigate = WorkshopPermissionHandler.CreateForTarget(target);
var navigation = """{"kind":"mcp","serverName":"playwright","toolName":"browser_navigate","args":{"url":"https://example.test/review?q=1#main"}}""";
await Decision(navigate, navigation, true);
await Decision(navigate, navigation.Replace("browser_navigate", "playwright-browser_navigate"), true);
foreach (var json in new[]
{
    "null", "{}", """{"kind":"unknown"}""", """{"kind":"shell"}""",
    """{"kind":"mcp","serverName":"playwright"}""",
    """{"kind":"mcp","serverName":"playwright","toolName":null,"args":{}}""",
    navigation.Replace("example.test", "other.test"),
    navigation.Replace("/review", "/other"), navigation.Replace("?q=1", "?q=2"),
    navigation.Replace("#main", "#other"), navigation.Replace("browser_navigate", "browser_evaluate"),
    navigation.Replace("playwright", "other"), navigation.Replace("\"url\":", "\"other\":"),
    navigation.Replace("\"args\":{", "\"args\":{\"ignored\":true,").Replace("\"url\":", "\"other\":"),
    navigation.Replace("\"kind\":\"mcp\"", "\"kind\":\"mcp\",\"managedApprovalRequired\":true")
}) await Decision(navigate, json, false);

var wikipedia = CuratorSafety.WikipediaPermissionHandler();
foreach (var name in new[] { "search", "readArticle", "wikipedia-search", "wikipedia-readArticle" })
    await Decision(wikipedia, $$"""{"kind":"mcp","serverName":"wikipedia","toolName":"{{name}}"}""", true);
foreach (var json in new[]
{
    "null", "{}", """{"kind":"mcp"}""",
    """{"kind":"mcp","serverName":"other","toolName":"search"}""",
    """{"kind":"mcp","serverName":"wikipedia","toolName":"delete"}""",
    """{"kind":"mcp","serverName":"wikipedia","toolName":null}""",
    """{"kind":"mcp","serverName":"wikipedia","toolName":"search","managedApprovalRequired":true}"""
}) await Decision(wikipedia, json, false);

var directory = Directory.CreateTempSubdirectory("workshop-dotnet-checks-").FullName;
try
{
    var write = CuratorSafety.ExhibitWritePermission(directory);
    foreach (var name in new[] { "exhibit.html", "./exhibit.html", Path.Combine(directory, "exhibit.html") })
        await Decision(write, JsonSerializer.Serialize(new { kind = "write", fileName = name }), true);
    foreach (var json in new[]
    {
        "null", "{}", """{"kind":"write"}""", """{"kind":"write","fileName":null}""",
        """{"kind":"write","fileName":42}""", """{"kind":"write","fileName":""}""",
        """{"kind":"write","fileName":"bad\u0000path"}""",
        """{"kind":"write","fileName":"other.html"}""",
        """{"kind":"write","fileName":"../exhibit.html"}""",
        """{"kind":"write","fileName":"sub/exhibit.html"}""",
        """{"kind":"read","fileName":"exhibit.html"}""",
        """{"kind":"write","fileName":"exhibit.html","requestSandboxBypass":true}""",
        """{"kind":"write","fileName":"exhibit.html","managedApprovalRequired":true}"""
    }) await Decision(write, json, false);

    ArtifactCases(ArtifactVerifier.CaptureArtifactState, ArtifactVerifier.VerifyArtifactUpdate, "accessibility-report.html");
    ArtifactCases(CuratorSafety.CaptureArtifactState, CuratorSafety.VerifyArtifactUpdate, "exhibit.html");

    void ArtifactCases<T>(Func<string, string, T> capture, Action<T> verify, string name)
    {
        var path = Path.Combine(directory, name);
        var absent = capture(directory, name);
        Rejects(() => verify(absent), "absent");
        File.WriteAllText(path, "");
        Rejects(() => verify(absent), "empty");
        var empty = capture(directory, name);
        File.WriteAllText(path, "first");
        verify(absent); checks++;
        verify(empty); checks++;
        var previous = capture(directory, name);
        File.SetLastWriteTimeUtc(path, DateTime.UtcNow.AddMinutes(5));
        Rejects(() => verify(previous), "same bytes with changed timestamp", "No output update was verified.");
        Check(File.ReadAllText(path) == "first", "Previous file survives failed verification");
        var timestamp = File.GetLastWriteTimeUtc(path);
        File.WriteAllText(path, "other");
        File.SetLastWriteTimeUtc(path, timestamp);
        verify(previous); checks++;
        File.Delete(path);
        Directory.CreateDirectory(path);
        Rejects(() => capture(directory, name), "directory capture");
        Rejects(() => verify(absent), "directory output");
        Directory.Delete(path);
        var original = Path.Combine(directory, name + ".original");
        File.WriteAllText(original, "preserved");
        try
        {
            File.CreateSymbolicLink(path, original);
            Rejects(() => capture(directory, name), "symlink capture");
            Rejects(() => verify(absent), "symlink output");
            Check(File.ReadAllText(original) == "preserved", "Symlink destination preserved");
            File.Delete(path);
            File.CreateSymbolicLink(path, Path.Combine(directory, "missing"));
            Rejects(() => capture(directory, name), "dangling symlink");
        }
        catch (UnauthorizedAccessException) when (OperatingSystem.IsWindows())
        {
            Console.WriteLine("SKIP: Windows symlink privilege is unavailable.");
        }
        finally
        {
            File.Delete(path);
            File.Delete(original);
        }
        Rejects(() => capture(directory, "../" + name), "non-leaf target");
    }
}
finally
{
    Directory.Delete(directory, recursive: true);
}

Check(CuratorFacts.BoundFacts([" fact ", null, " "]).SequenceEqual(["fact"]), "Fact trimming");
Check(CuratorFacts.BoundFacts(Enumerable.Repeat(new string('x', 500), 20)).Length == 20, "Exact fact bounds");
Rejects(() => CuratorFacts.BoundFacts([]), "empty facts");
Rejects(() => CuratorFacts.BoundFacts(Enumerable.Repeat("fact", 21)), "fact count");
Rejects(() => CuratorFacts.BoundFacts([new string('x', 501)]), "fact length");
Check(CuratorFacts.CreateApprovedFactLookup(["fact"]).Name == "approved_fact_lookup", "Tool name");

string Exhibit(int words) => "# Exhibit\n## Narrative\n" + string.Join(" ", Enumerable.Repeat("history", words))
    + "\n## Visitor questions\n1. Why?\n2. How?\n3. What?";
Check(CuratorValidation.ValidateExhibit(Exhibit(100)).Valid, "100 word narrative");
Check(CuratorValidation.ValidateExhibit(Exhibit(140)).Valid, "140 word narrative");
foreach (var text in new[] { "", Exhibit(99), Exhibit(141), Exhibit(100).Replace("## Narrative", "Narrative"),
    Exhibit(100).Replace("3. What?", "3. What"), Exhibit(100) + "\n4. Where?", Exhibit(100) + "\nsoftware" })
    Check(!CuratorValidation.ValidateExhibit(text).Valid, "Structural rejection");
Check(CuratorSafety.ExtractSources("notes").Sources.Count == 0, "Missing citations");
Check(CuratorSafety.ExtractSources("notes\n## Sources\nmalformed").Sources.Count == 0, "Malformed citations");
Check(CuratorSafety.ExtractSources("notes\n## Sources\n- Moon: https://en.wikipedia.org/wiki/Moon").Sources.Count == 1,
    "Model-written citation parsing");
checks += await StreamingChecks.RunAsync();
Console.WriteLine($"PASS: {checks} .NET deterministic checks.");
