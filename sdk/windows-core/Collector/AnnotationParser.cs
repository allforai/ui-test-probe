using UITestProbe.Core.Models;

namespace UITestProbe.Core.Collector;

/// <summary>
/// Shared parsing logic for probe annotation strings. Used by all Windows framework adapters.
/// </summary>
public static class AnnotationParser
{
    public static ProbeType ParseProbeType(string? typeStr)
    {
        if (typeStr == null) return ProbeType.Display;
        return Enum.TryParse<ProbeType>(typeStr, ignoreCase: true, out var parsed)
            ? parsed : ProbeType.Display;
    }

    public static SourceInfo ParseSource(string raw)
    {
        var parts = raw.Split(' ', 2, StringSplitOptions.TrimEntries);
        return new SourceInfo
        {
            Method = parts.Length > 1 ? parts[0] : "GET",
            Url = parts.Length > 1 ? parts[1] : parts[0],
        };
    }

    public static LinkageInfo ParseLinkage(string raw)
    {
        var segments = raw.Split('|', StringSplitOptions.TrimEntries);
        var targets = new List<LinkageTarget>();

        foreach (var segment in segments)
        {
            var props = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in segment.Split(';', StringSplitOptions.TrimEntries))
            {
                var kv = pair.Split(':', 2, StringSplitOptions.TrimEntries);
                if (kv.Length == 2) props[kv[0]] = kv[1];
            }

            if (!props.TryGetValue("target", out var targetId)) continue;

            var effect = LinkageEffect.DataReload;
            if (props.TryGetValue("effect", out var effectStr))
                Enum.TryParse(effectStr, ignoreCase: true, out effect);

            LinkagePath path = new DirectPath();
            if (props.TryGetValue("path", out var pathStr))
                path = ParseLinkagePath(pathStr);

            targets.Add(new LinkageTarget { Id = targetId, Effect = effect, Path = path });
        }

        return new LinkageInfo { Targets = targets };
    }

    public static LinkagePath ParseLinkagePath(string pathStr)
    {
        var colonIdx = pathStr.IndexOf(':');
        if (colonIdx < 0) return new DirectPath();

        var kind = pathStr[..colonIdx].Trim().ToLowerInvariant();
        var value = pathStr[(colonIdx + 1)..].Trim();

        return kind switch
        {
            "api" => new ApiPath { Url = value },
            "store" => new StorePath { StoreName = value },
            "chain" => new ChainPath { Through = value },
            "navigation" => new NavigationPath { Route = value },
            "computed" => new ComputedPath { Expression = value },
            _ => new DirectPath(),
        };
    }

    public static IReadOnlyList<string>? ParseChildren(string? childrenStr)
    {
        return childrenStr?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }
}
