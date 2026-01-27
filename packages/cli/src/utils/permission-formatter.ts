import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import type {
  PermissionSummary,
  TrackedPermission,
} from "#parsers/permission-types";

/**
 * Format a tool call to Claude settings format.
 * - Bash → extract command param: "Bash(bunx vitest)"
 * - WebFetch → extract full URL: "WebFetch(https://example.com)"
 * - WebSearch → extract query: "WebSearch(query text)"
 * - Others → just tool name
 *
 * @param toolCall - The tool call update from ACP
 * @param resolvedToolName - Optional pre-resolved tool name (from cache)
 */
export function formatPermissionName(
  toolCall: ToolCallUpdate,
  resolvedToolName?: string
): string {
  // Use resolved name first, then try _meta, then fallback to title
  const claudeCode = (
    toolCall._meta as { claudeCode?: { toolName?: string } } | undefined
  )?.claudeCode;
  const rawToolName =
    resolvedToolName ?? claudeCode?.toolName ?? toolCall.title ?? "Unknown";
  // Extract base tool name (e.g., "Bash(ls)" → "Bash", "Fetch https://..." → "Fetch")
  const toolName = rawToolName.match(/^(\w+)/)?.[1] ?? rawToolName;
  const rawInput = toolCall.rawInput as Record<string, unknown> | undefined;

  switch (toolName) {
    case "Bash": {
      const command = rawInput?.command;
      if (typeof command === "string") {
        return `Bash(${command})`;
      }
      return "Bash";
    }
    case "Fetch":
    case "WebFetch": {
      const url = rawInput?.url;
      if (typeof url === "string") {
        return `WebFetch(${url})`;
      }
      return "WebFetch";
    }
    case "WebSearch": {
      const query = rawInput?.query;
      if (typeof query === "string") {
        return `WebSearch(${query})`;
      }
      return "WebSearch";
    }
    default:
      return toolName;
  }
}

/**
 * Summarize tracked permissions by deduping and counting.
 */
export function summarizePermissions(
  tracked: TrackedPermission[]
): PermissionSummary[] {
  const counts = new Map<string, PermissionSummary>();

  for (const perm of tracked) {
    const key = `${perm.status}:${perm.formattedName}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, {
        formattedName: perm.formattedName,
        status: perm.status,
        count: 1,
      });
    }
  }

  return Array.from(counts.values());
}

/**
 * Format permission summary for console output.
 */
export function formatPermissionSummary(summary: PermissionSummary[]): string {
  if (summary.length === 0) {
    return "";
  }

  const allowed = summary.filter((s) => s.status === "allowed");
  const denied = summary.filter((s) => s.status === "denied");

  const lines: string[] = [];
  lines.push("╭─ Permission Summary ─────────────────────────────────────╮");
  lines.push("│ Add to .claude/settings.local.json for unattended runs: │");
  lines.push("╰──────────────────────────────────────────────────────────╯");
  lines.push("");

  if (allowed.length > 0) {
    lines.push("Allowed:");
    for (const perm of allowed) {
      const countStr = perm.count > 1 ? ` (${perm.count}x)` : "";
      lines.push(`  "${perm.formattedName}"${countStr}`);
    }
  }

  if (denied.length > 0) {
    if (allowed.length > 0) {
      lines.push("");
    }
    lines.push("Denied:");
    for (const perm of denied) {
      const countStr = perm.count > 1 ? ` (${perm.count}x)` : "";
      lines.push(`  "${perm.formattedName}"${countStr}`);
    }
  }

  return lines.join("\n");
}
