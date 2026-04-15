import type { SessionStatus } from "#parsers/message-types";

export const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  thinking: { icon: "\u25c7", color: "#9d7cd8" },
  responding: { icon: "\u25c9", color: "#00aaff" },
  tool_executing: { icon: "\u26a1", color: "#f5a742" },
  waiting: { icon: "\u25cc", color: "#808080" },
};

export const LOOP_STATE_COLORS: Record<string, string> = {
  initializing: "#f5a742",
  prompting: "#f5a742",
  streaming: "#00aaff",
  thinking: "#c792ea",
  tool_executing: "#f78c6c",
  completing: "#00aaff",
};

export function getStatusIcon(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "↻";
    case "complete":
      return "↻";
    case "error":
      return "✗";
    case "paused":
      return "⏸";
    case "stopped":
      return "⏹";
    default:
      return "?";
  }
}

export function getStatusColor(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "#00aaff";
    case "complete":
      return "#333333";
    case "error":
      return "#ff0000";
    case "paused":
      return "#ffff00";
    case "stopped":
      return "#ffaa00";
    default:
      return "#808080";
  }
}

export function getActivityIndicator(
  activity: string | undefined
): { icon: string; color: string } | null {
  if (activity === "idle" || !activity) {
    return null;
  }
  return ACTIVITY_ICONS[activity] ?? null;
}
