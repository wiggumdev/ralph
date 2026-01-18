import type { ToolKind } from "@agentclientprotocol/sdk";
import { Show } from "solid-js";
import type {
  ToolBlock as ToolBlockType,
  ToolCallContent,
} from "#parsers/message-types";
import { CodeResultBlock } from "#ui/components/blocks/code-result-block";
import { defaultSyntaxStyle } from "#ui/styles/syntax-styles";
import { generateUnifiedDiff } from "#utils/diff-formatter";
import { getFiletypeFromPath } from "#utils/filetype";
import { formatToolDisplay } from "#utils/tool-formatter";

export interface ToolBlockProps {
  block: ToolBlockType;
  expanded: boolean;
}

function getToolIconByKind(kind: ToolKind | undefined): string {
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

function getToolIconByName(name: string): string {
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

function getToolIcon(name: string, kind: ToolKind | undefined): string {
  if (kind) {
    return getToolIconByKind(kind);
  }
  return getToolIconByName(name);
}

function getToolColorByKind(kind: ToolKind | undefined): string {
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

function getToolColorByName(name: string): string {
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

function getToolColor(name: string, kind: ToolKind | undefined): string {
  if (kind) {
    return getToolColorByKind(kind);
  }
  return getToolColorByName(name);
}

// Claude format: "    1\u2192content"
const CLAUDE_READ_PATTERN = /^\s*\d+\u2192/;
const CLAUDE_READ_LINE_NUM_PATTERN = /^\s*(\d+)\u2192/;
const CLAUDE_READ_STRIP_PATTERN = /^\s*\d+\u2192/;

function countReadLines(text: string): number {
  return text.split("\n").filter((line) => CLAUDE_READ_PATTERN.test(line))
    .length;
}

function extractReadContent(text: string): {
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

function getResultSummary(content: ToolCallContent[] | undefined): string {
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

export function ToolBlock(props: ToolBlockProps) {
  const toolName = () =>
    (props.block.resolvedName || props.block.title).toLowerCase();

  // Don't render TodoWrite - handled by session panel sidebar
  if (toolName() === "todowrite" || toolName() === "todo_write") {
    return null;
  }

  const input = () => props.block.rawInput ?? {};
  const displayName = () =>
    formatToolDisplay(props.block.resolvedName || props.block.title, input());
  const icon = () => getToolIcon(props.block.title, props.block.kind);
  const iconColor = () => getToolColor(props.block.title, props.block.kind);

  const statusIndicator = () => {
    switch (props.block.status) {
      case "pending":
        return "\u25cb";
      case "in_progress":
        return "\u25d0";
      case "completed":
        return "\u2713";
      case "failed":
        return "\u2717";
      default:
        return "";
    }
  };

  const statusColor = () => {
    switch (props.block.status) {
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
  };

  const isEdit = () => toolName() === "edit";

  const filePath = () => (input().file_path as string) || "";

  const unifiedDiff = () => {
    if (!isEdit()) {
      return "";
    }
    const oldStr =
      (input().old_string as string) || (input().oldString as string) || "";
    const newStr =
      (input().new_string as string) || (input().newString as string) || "";
    if (!(oldStr || newStr)) {
      return "";
    }
    return generateUnifiedDiff(oldStr, newStr, filePath());
  };

  const filetype = () => getFiletypeFromPath(filePath());

  const resultSummary = () => getResultSummary(props.block.content);

  const isRead = () => toolName() === "read";

  const readContent = () => {
    if (!(isRead() && props.block.content)) {
      return null;
    }
    for (const item of props.block.content) {
      if (item.type === "content" && item.content.type === "text") {
        const text = item.content.text;
        if (CLAUDE_READ_PATTERN.test(text)) {
          return extractReadContent(text);
        }
      }
    }
    return null;
  };

  const readFilePath = () => (input().file_path as string) || "";

  return (
    <box flexDirection="column">
      <text>
        <span style={{ fg: statusColor() }}>{statusIndicator()} </span>
        <span style={{ fg: iconColor() }}>{icon()} </span>
        <span style={{ fg: "#808080" }}>{displayName()}</span>
      </text>

      <Show when={isEdit() && unifiedDiff()}>
        <box style={{ marginLeft: 2 }}>
          <diff
            addedBg="#1a4d1a"
            addedSignColor="#22c55e"
            diff={unifiedDiff()}
            filetype={filetype()}
            removedBg="#4d1a1a"
            removedSignColor="#ef4444"
            showLineNumbers={true}
            syntaxStyle={defaultSyntaxStyle}
            view="unified"
          />
        </box>
      </Show>

      <Show
        when={
          !(isEdit() || isRead()) &&
          props.block.status === "completed" &&
          resultSummary() &&
          resultSummary().trim().length > 1
        }
      >
        <text>
          <span style={{ fg: "#666666" }}> ⎿ {resultSummary()}</span>
        </text>
      </Show>

      <Show when={isRead() && props.expanded && readContent()}>
        <box style={{ marginLeft: 2 }}>
          <CodeResultBlock
            content={readContent()?.content ?? ""}
            filePath={readFilePath()}
            startLine={readContent()?.startLine}
          />
        </box>
      </Show>

      <Show when={isRead() && !props.expanded && resultSummary()}>
        <text>
          <span style={{ fg: "#666666" }}> ⎿ {resultSummary()}</span>
        </text>
      </Show>
    </box>
  );
}
