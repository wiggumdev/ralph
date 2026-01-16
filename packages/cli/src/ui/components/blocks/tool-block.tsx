import type { ToolKind } from "@agentclientprotocol/sdk";
import { diffLines as computeDiff } from "diff";
import { For, Show } from "solid-js";
import type {
  ToolBlock as ToolBlockType,
  ToolCallContent,
} from "#parsers/message-types";

export interface ToolBlockProps {
  block: ToolBlockType;
  expanded: boolean;
}

interface DiffLine {
  lineNum: string;
  prefix: string;
  content: string;
  color: string;
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

function formatParams(name: string, input: Record<string, unknown>): string {
  const filePath =
    (input.file_path as string) || (input.filePath as string) || "";

  switch (name.toLowerCase()) {
    case "read":
    case "write":
    case "edit":
      return filePath;
    case "bash": {
      const cmd = (input.command as string) || "";
      return cmd.length > 50 ? `${cmd.slice(0, 50)}...` : cmd;
    }
    case "glob":
      return `"${input.pattern}"`;
    case "grep": {
      const path = input.path as string;
      return path ? `"${input.pattern}" in ${path}` : `"${input.pattern}"`;
    }
    case "task":
      return (input.description as string) || "";
    case "todowrite":
    case "todo_write":
      return "";
    default:
      return "";
  }
}

function computeDiffData(
  oldStr: string,
  newStr: string
): { lines: DiffLine[]; added: number; removed: number } {
  const changes = computeDiff(oldStr, newStr);
  const lines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  let added = 0;
  let removed = 0;

  for (const change of changes) {
    const changeLines = change.value.split("\n");
    if (changeLines.at(-1) === "") {
      changeLines.pop();
    }

    for (const line of changeLines) {
      if (change.added) {
        lines.push({
          lineNum: String(newLineNum).padStart(5),
          prefix: "+",
          content: line,
          color: "#00ff00",
        });
        newLineNum++;
        added++;
      } else if (change.removed) {
        lines.push({
          lineNum: String(oldLineNum).padStart(5),
          prefix: "-",
          content: line,
          color: "#ff6666",
        });
        oldLineNum++;
        removed++;
      } else {
        lines.push({
          lineNum: String(newLineNum).padStart(5),
          prefix: " ",
          content: line,
          color: "#888888",
        });
        oldLineNum++;
        newLineNum++;
      }
    }
  }

  return { lines, added, removed };
}

// Claude format: "    1\u2192content"
const CLAUDE_READ_PATTERN = /^\s*\d+\u2192/;

function countReadLines(text: string): number {
  return text.split("\n").filter((line) => CLAUDE_READ_PATTERN.test(line))
    .length;
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
  const toolName = () => props.block.title.toLowerCase();

  // Don't render TodoWrite - handled by session panel sidebar
  if (toolName() === "todowrite" || toolName() === "todo_write") {
    return null;
  }

  const input = () => props.block.rawInput ?? {};
  const params = () => formatParams(props.block.title, input());
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

  const locationSummary = () => {
    const locs = props.block.locations;
    if (!locs || locs.length === 0) {
      return "";
    }
    const first = locs[0];
    if (!first) {
      return "";
    }
    const lineInfo = first.line ? `:${first.line}` : "";
    if (locs.length === 1) {
      return `${first.path}${lineInfo}`;
    }
    return `${first.path}${lineInfo} (+${locs.length - 1} more)`;
  };

  const isEdit = () => toolName() === "edit";
  const diffData = () => {
    if (!isEdit()) {
      return { lines: [], added: 0, removed: 0 };
    }
    const oldStr =
      (input().old_string as string) || (input().oldString as string) || "";
    const newStr =
      (input().new_string as string) || (input().newString as string) || "";
    return computeDiffData(oldStr, newStr);
  };

  const diffSummary = () => {
    const { added, removed } = diffData();
    const parts: string[] = [];
    if (added > 0) {
      parts.push(`Added ${added} line${added !== 1 ? "s" : ""}`);
    }
    if (removed > 0) {
      parts.push(`removed ${removed} line${removed !== 1 ? "s" : ""}`);
    }
    return parts.join(", ");
  };

  const resultSummary = () => getResultSummary(props.block.content);

  return (
    <box flexDirection="column">
      <text>
        <span style={{ fg: statusColor() }}>{statusIndicator()} </span>
        <span style={{ fg: iconColor() }}>{icon()} </span>
        <span style={{ fg: "#808080" }}>{toolName()}</span>
        <Show when={params()}>
          <span style={{ fg: "#606060" }}> {params()}</span>
        </Show>
        <Show when={!params() && locationSummary()}>
          <span style={{ fg: "#606060" }}> {locationSummary()}</span>
        </Show>
      </text>

      <Show when={isEdit() && diffData().lines.length > 0}>
        <text>
          <span style={{ fg: "#888888" }}>\u23bf {diffSummary()}</span>
        </text>
        <box flexDirection="column" style={{ marginLeft: 4 }}>
          <For each={diffData().lines}>
            {(line) => (
              <text>
                <span style={{ fg: "#666666" }}>{line.lineNum}</span>
                <span style={{ fg: line.color }}>
                  {line.prefix} {line.content}
                </span>
              </text>
            )}
          </For>
        </box>
      </Show>

      <Show
        when={
          !isEdit() &&
          props.block.status === "completed" &&
          resultSummary() &&
          resultSummary().trim().length > 1
        }
      >
        <text>
          <span style={{ fg: "#666666" }}> \u23bf {resultSummary()}</span>
        </text>
      </Show>
    </box>
  );
}
