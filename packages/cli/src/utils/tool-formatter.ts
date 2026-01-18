/**
 * Format tool display as ToolName(params).
 * Uses resolvedName which already has proper casing from adapter.
 */
export function formatToolDisplay(
  resolvedName: string,
  input: Record<string, unknown>,
  maxLength = 50
): string {
  const name = resolvedName.toLowerCase();
  const truncate = (s: string) =>
    s.length > maxLength ? `${s.slice(0, maxLength)}...` : s;

  switch (name) {
    case "bash": {
      const cmd = (input.command as string) || "";
      return cmd ? `${resolvedName}(${truncate(cmd)})` : resolvedName;
    }
    case "read":
    case "write":
    case "edit": {
      const path =
        (input.file_path as string) || (input.filePath as string) || "";
      return path ? `${resolvedName}(${path})` : resolvedName;
    }
    case "glob":
      return input.pattern ? `${resolvedName}(${input.pattern})` : resolvedName;
    case "grep": {
      const pattern = input.pattern as string;
      const path = input.path as string;
      if (!pattern) {
        return resolvedName;
      }
      const suffix = path ? `${pattern} in ${path}` : pattern;
      return `${resolvedName}(${suffix})`;
    }
    case "websearch":
      return input.query ? `${resolvedName}(${input.query})` : resolvedName;
    case "webfetch":
      return input.url ? `${resolvedName}(${input.url})` : resolvedName;
    case "task":
      return input.description
        ? `${resolvedName}(${input.description})`
        : resolvedName;
    default:
      return resolvedName;
  }
}
