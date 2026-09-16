using System.Security.Cryptography;

namespace AccessibilityReport.Helpers;

public static class ArtifactVerifier
{
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
