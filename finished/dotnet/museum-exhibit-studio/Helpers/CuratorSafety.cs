using System.Security.Cryptography;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;

namespace MuseumExhibitStudio.Helpers;

#pragma warning disable GHCP001 // Custom permission decisions are evaluation-only in SDK 1.0.11.

public sealed record ResearchSource(string Title, string Url);

public sealed record ExtractedSources(string Body, IReadOnlyList<ResearchSource> Sources);

public static class CuratorSafety
{
    public const string ExhibitFileName = "exhibit.html";

    public static IReadOnlyList<string> WikipediaTools { get; } =
    [
        "wikipedia-search",
        "wikipedia-readArticle"
    ];

    private static readonly HashSet<string> AllowedWikipediaToolNames =
    [
        "search",
        "readArticle",
        "wikipedia-search",
        "wikipedia-readArticle"
    ];

    // Return this config as the "wikipedia" value in SessionConfig.McpServers.
    public static McpStdioServerConfig WikipediaServer() => new()
    {
        Command = "npx",
        Args = ["-y", "wikipedia-mcp@1.0.3"],
        WorkingDirectory = Directory.GetCurrentDirectory(),
        Tools = ["search", "readArticle"]
    };

    public static Func<PermissionRequest, PermissionInvocation, Task<PermissionDecision>> WikipediaPermissionHandler() =>
        (request, _) =>
        {
            var decision = request is PermissionRequestMcp { ServerName: "wikipedia", ManagedApprovalRequired: not true } wikipedia &&
                           AllowedWikipediaToolNames.Contains(wikipedia.ToolName)
                ? PermissionDecision.ApproveOnce()
                : PermissionDecision.Reject(
                    "This session allows only the scoped Wikipedia search and article tools.");

            return Task.FromResult(decision);
        };

    // Parses model-written links, not evidence that an article exists or was consulted.
    public static ExtractedSources ExtractSources(string content)
    {
        if (string.IsNullOrEmpty(content))
        {
            return new ExtractedSources(string.Empty, []);
        }

        var lines = content.ReplaceLineEndings("\n").Split('\n');
        var sourcesIndex = Array.FindLastIndex(
            lines,
            line => line.Trim().Equals("## Sources", StringComparison.OrdinalIgnoreCase));

        if (sourcesIndex < 0)
        {
            return new ExtractedSources(content.Trim(), []);
        }

        var body = string.Join('\n', lines[..sourcesIndex]).Trim();
        var sources = new List<ResearchSource>();

        foreach (var line in lines[(sourcesIndex + 1)..])
        {
            var trimmed = line.Trim();
            if (!trimmed.StartsWith("- ", StringComparison.Ordinal))
            {
                continue;
            }

            var item = trimmed[2..].Trim();
            var separatorIndex = item.IndexOf(": https://", StringComparison.OrdinalIgnoreCase);
            if (separatorIndex <= 0)
            {
                continue;
            }

            var title = item[..separatorIndex].Trim();
            var url = item[(separatorIndex + 2)..].Trim();
            if (title.Length == 0 || !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            sources.Add(new ResearchSource(title, url));
        }

        return new ExtractedSources(body, sources.AsReadOnly());
    }

    public static Func<PermissionRequest, PermissionInvocation, Task<PermissionDecision>> ExhibitWritePermission(
        string workingDirectory)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(workingDirectory);

        var normalizedWorkingDirectory = Path.GetFullPath(workingDirectory);
        var allowedPath = Path.GetFullPath(Path.Combine(normalizedWorkingDirectory, ExhibitFileName));

        return (request, _) =>
        {
            var decision = request is PermissionRequestWrite { ManagedApprovalRequired: not true, RequestSandboxBypass: not true } write &&
                           IsAllowedExhibitPath(write.FileName, normalizedWorkingDirectory, allowedPath)
                ? PermissionDecision.ApproveOnce()
                : PermissionDecision.Reject(
                    "This session allows writing only exhibit.html in the application working directory.");

            return Task.FromResult(decision);
        };
    }

    private static bool IsAllowedExhibitPath(
        string fileName,
        string workingDirectory,
        string allowedPath)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return false;
        }

        try
        {
            var requestedPath = Path.GetFullPath(fileName, workingDirectory);
            return requestedPath.Equals(allowedPath, OperatingSystem.IsWindows()
                       ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal) &&
                   new FileInfo(allowedPath).LinkTarget is null &&
                   !Directory.Exists(allowedPath);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    public sealed class ArtifactState
    {
        internal string FullPath { get; }
        internal byte[]? Hash { get; }

        internal ArtifactState(string fullPath, byte[]? hash)
        {
            FullPath = fullPath;
            Hash = hash;
        }
    }

    public static ArtifactState CaptureArtifactState(string workingDirectory, string fileName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(workingDirectory);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        if (fileName is "." or ".." || fileName.IndexOfAny(['/', '\\']) >= 0 || Path.IsPathRooted(fileName))
        {
            throw new ArgumentException("Specify a single file name in the working directory.", nameof(fileName));
        }
        if (!Directory.Exists(workingDirectory))
        {
            throw new DirectoryNotFoundException("The artifact working directory must exist.");
        }

        var fullPath = Path.GetFullPath(Path.Combine(workingDirectory, fileName));
        return new ArtifactState(fullPath, ReadArtifactHash(fullPath, requireNonempty: false));
    }

    public static void VerifyArtifactUpdate(ArtifactState snapshot)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        var hash = ReadArtifactHash(snapshot.FullPath, requireNonempty: true);
        if (hash is null || (snapshot.Hash is not null && hash.AsSpan().SequenceEqual(snapshot.Hash)))
        {
            throw new InvalidOperationException("No output update was verified.");
        }
    }

    private static byte[]? ReadArtifactHash(string path, bool requireNonempty)
    {
        FileAttributes attributes;
        try
        {
            attributes = File.GetAttributes(path);
        }
        catch (FileNotFoundException)
        {
            return null;
        }

        if ((attributes & (FileAttributes.Directory | FileAttributes.ReparsePoint | FileAttributes.Device)) != 0)
        {
            throw new InvalidOperationException("No output update was verified. The target must be a regular nonsymlink file.");
        }

        using var stream = File.OpenRead(path);
        if (!stream.CanSeek || (requireNonempty && stream.Length == 0))
        {
            throw new InvalidOperationException("No output update was verified. The target must be a nonempty regular file.");
        }
        return SHA256.HashData(stream);
    }
}

#pragma warning restore GHCP001
