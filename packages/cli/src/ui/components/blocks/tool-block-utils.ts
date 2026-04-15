import type { ToolKind } from "@agentclientprotocol/sdk";
import type { ToolCallContent } from "#parsers/message-types";

export function getToolIconByKind(kind: ToolKind | undefined): string {
  switch (kind) {
    case "read":
      return "\u2192";
    case "edit":
      return "\u2194";
    case "delete":
      return "\u2717";
    case "move":
      return "\u21c4";
    case "search":
      return "\u2731";
    case "execute":
      return "$";
    case "think":
      return "\u25c7";
    case "fetch":
      return "%";
    case "switch_mode":
      return "\u21bb";
    default:
      return "\u25cf";
  }
}

export function getToolIconByName(name: string): string {
  switch (name.toLowerCase()) {
    case "glob":
    case "grep":
      return "\u2731";
    case "read":
      return "\u2192";
    case "write":
      return "\u2190";
    case "edit":
      return "\u2194";
    case "bash":
      return "$";
    case "task":
      return "\u25c7";
    case "todowrite":
    case "todo_write":
      return "\u2610";
    case "webfetch":
      return "%";
    case "askuserquestion":
      return "?";
    default:
      return "\u25cf";
  }
}

export function getToolIcon(name: string, kind: ToolKind | undefined): string {
  if (kind) {
    return getToolIconByKind(kind);
  }
  return getToolIconByName(name);
}

export function getToolColorByKind(kind: ToolKind | undefined): string {
  switch (kind) {
    case "read":
      return "#5c9cf5";
    case "edit":
      return "#f5a742";
    case "delete":
      return "#ff6666";
    case "move":
      return "#f5a742";
    case "search":
      return "#9d7cd8";
    case "execute":
      return "#fab283";
    case "think":
      return "#56b6c2";
    case "fetch":
      return "#5c9cf5";
    case "switch_mode":
      return "#56b6c2";
    default:
      return "#808080";
  }
}

export function getToolColorByName(name: string): string {
  switch (name.toLowerCase()) {
    case "read":
      return "#5c9cf5";
    case "write":
      return "#7fd88f";
    case "edit":
      return "#f5a742";
    case "bash":
      return "#fab283";
    case "glob":
    case "grep":
      return "#9d7cd8";
    case "task":
      return "#56b6c2";
    default:
      return "#808080";
  }
}

export function getToolColor(name: string, kind: ToolKind | undefined): string {
  if (kind) {
    return getToolColorByKind(kind);
  }
  return getToolColorByName(name);
}

// Claude format: "    1→content"
export const CLAUDE_READ_PATTERN = /^\s*\d+\u2192/;
export const CLAUDE_READ_LINE_NUM_PATTERN = /^\s*(\d+)\u2192/;
export const CLAUDE_READ_STRIP_PATTERN = /^\s*\d+\u2192/;

export function countReadLines(text: string): number {
  return text.split("\n").filter((line) => CLAUDE_READ_PATTERN.test(line))
    .length;
}

export function extractReadContent(text: string): {
  content: string;
  startLine: number;
} {
  const lines = text
    .split("\n")
    .filter((line) => CLAUDE_READ_PATTERN.test(line));
  if (lines.length === 0) {
    return { content: "", startLine: 1 };
  }

  // Extract start line from first line (format: "    1→content")
  const firstMatch = lines[0]?.match(CLAUDE_READ_LINE_NUM_PATTERN);
  const startLine = firstMatch ? Number.parseInt(firstMatch[1] ?? "1", 10) : 1;

  // Remove line number prefix from each line
  const content = lines
    .map((line) => line.replace(CLAUDE_READ_STRIP_PATTERN, ""))
    .join("\n");

  return { content, startLine };
}

export function getResultSummary(
  content: ToolCallContent[] | undefined
): string {
  if (!content || content.length === 0) {
    return "";
  }

  for (const item of content) {
    if (item.type === "content" && item.content.type === "text") {
      const text = item.content.text;
      if (CLAUDE_READ_PATTERN.test(text)) {
        const count = countReadLines(text);
        return `Read ${count} line${count !== 1 ? "s" : ""}`;
      }
      const firstLine = text.split("\n")[0] || "";
      return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
    }
  }
  return "";
}
