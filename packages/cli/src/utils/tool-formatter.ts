function shortenPath(path: string, cwd?: string): string {
  if (cwd && path.startsWith(cwd)) {
    const stripped = path.slice(cwd.length);
    return stripped.startsWith("/") ? stripped.slice(1) : stripped;
  }
  return path;
}

/**
 * Extract the key parameter string for a tool based on its name.
 */
function extractToolParam(
  name: string,
  input: Record<string, unknown>,
  cwd?: string
): string {
  switch (name) {
    case "bash": {
      const desc = (input.description as string) || "";
      const cmd = (input.command as string) || "";
      return desc || cmd;
    }
    case "read":
    case "write":
    case "edit": {
      const filePath =
        (input.file_path as string) || (input.filePath as string) || "";
      return shortenPath(filePath, cwd);
    }
    case "glob":
      return (input.pattern as string) || "";
    case "grep": {
      const pattern = input.pattern as string;
      if (!pattern) {
        return "";
      }
      const path = input.path as string;
      return path ? `${pattern} in ${shortenPath(path, cwd)}` : pattern;
    }
    case "websearch":
      return (input.query as string) || "";
    case "webfetch":
      return (input.url as string) || "";
    case "task":
      return (input.description as string) || "";
    default:
      return "";
  }
}

/**
 * Format tool display as ToolName(params).
 * Uses resolvedName which already has proper casing from adapter.
 */
export function formatToolDisplay(
  resolvedName: string,
  input: Record<string, unknown>,
  maxLength = 50,
  cwd?: string
): string {
  const name = resolvedName.toLowerCase();
  const truncate = (s: string) =>
    s.length > maxLength ? `${s.slice(0, maxLength)}...` : s;

  const param = extractToolParam(name, input, cwd);
  return param ? `${resolvedName}(${truncate(param)})` : resolvedName;
}
