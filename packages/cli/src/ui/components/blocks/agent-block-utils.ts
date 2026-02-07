import type { ToolCallStatus } from "@agentclientprotocol/sdk";

export const CYAN = "#56b6c2";
export const COLLAPSED_PREVIEW_LENGTH = 40;

export function getStatusIndicator(status: ToolCallStatus): string {
  switch (status) {
    case "pending":
      return "○";
    case "in_progress":
      return "◐";
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    default:
      return "";
  }
}

export function getStatusColor(status: ToolCallStatus): string {
  switch (status) {
    case "pending":
      return "#666666";
    case "in_progress":
      return "#f5a742";
    case "completed":
      return "#7fd88f";
    case "failed":
      return "#ff6666";
    default:
      return "#666666";
  }
}

export function truncatePreview(
  text: string,
  maxLength: number = COLLAPSED_PREVIEW_LENGTH
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}
