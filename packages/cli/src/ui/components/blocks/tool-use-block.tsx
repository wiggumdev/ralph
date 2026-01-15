import { diffLines as computeDiff } from "diff";
import { For, Show } from "solid-js";
import type { ToolUseBlock as ToolUseBlockType } from "#parsers/message-types";

export interface ToolUseBlockProps {
  block: ToolUseBlockType;
  expanded: boolean;
}

interface DiffLine {
  lineNum: string;
  prefix: string;
  content: string;
  color: string;
}

function getToolIconByKind(kind: string | undefined): string {
  switch (kind) {
    case "read":
      return "→";
    case "edit":
      return "↔";
    case "delete":
      return "✗";
    case "move":
      return "⇄";
    case "search":
      return "✱";
    case "execute":
      return "$";
    case "think":
      return "◇";
    case "fetch":
      return "%";
    default:
      return "●";
  }
}

function getToolIconByName(name: string): string {
  switch (name.toLowerCase()) {
    case "glob":
    case "grep":
      return "✱";
    case "read":
      return "→";
    case "write":
      return "←";
    case "edit":
      return "↔";
    case "bash":
      return "$";
    case "task":
      return "◇";
    case "todowrite":
    case "todo_write":
      return "☐";
    case "webfetch":
      return "%";
    case "askuserquestion":
      return "?";
    default:
      return "●";
  }
}

function getToolIcon(name: string, kind: string | undefined): string {
  if (kind) {
    return getToolIconByKind(kind);
  }
  return getToolIconByName(name);
}

function getToolColorByKind(kind: string | undefined): string {
  switch (kind) {
    case "read":
      return "#5c9cf5"; // blue
    case "edit":
      return "#f5a742"; // orange
    case "delete":
      return "#ff6666"; // red
    case "move":
      return "#f5a742"; // orange
    case "search":
      return "#9d7cd8"; // purple
    case "execute":
      return "#fab283"; // peach
    case "think":
      return "#56b6c2"; // cyan
    case "fetch":
      return "#5c9cf5"; // blue
    default:
      return "#808080";
  }
}

function getToolColorByName(name: string): string {
  switch (name.toLowerCase()) {
    case "read":
      return "#5c9cf5"; // blue
    case "write":
      return "#7fd88f"; // green
    case "edit":
      return "#f5a742"; // orange
    case "bash":
      return "#fab283"; // peach
    case "glob":
    case "grep":
      return "#9d7cd8"; // purple
    case "task":
      return "#56b6c2"; // cyan
    default:
      return "#808080";
  }
}

function getToolColor(name: string, kind: string | undefined): string {
  if (kind) {
    return getToolColorByKind(kind);
  }
  return getToolColorByName(name);
}

function formatParams(name: string, input: Record<string, unknown>): string {
  // Handle both snake_case (Claude) and camelCase (OpenCode) formats
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
): {
  lines: DiffLine[];
  added: number;
  removed: number;
} {
  const changes = computeDiff(oldStr, newStr);
  const lines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  let added = 0;
  let removed = 0;

  for (const change of changes) {
    const changeLines = change.value.split("\n");
    // Remove last empty element from split if ends with newline
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

export function ToolUseBlock(props: ToolUseBlockProps) {
  const toolName = () => props.block.name.toLowerCase();

  // Don't render TodoWrite - handled by session panel sidebar
  if (toolName() === "todowrite" || toolName() === "todo_write") {
    return null;
  }

  const input = () => props.block.input as Record<string, unknown>;
  const params = () => formatParams(props.block.name, input());
  const icon = () => getToolIcon(props.block.name, props.block.kind);
  const iconColor = () => getToolColor(props.block.name, props.block.kind);

  const statusIndicator = () => {
    switch (props.block.status) {
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
    // Handle both snake_case (Claude) and camelCase (OpenCode) formats
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

  return (
    <box flexDirection="column">
      <text>
        <Show when={props.block.status}>
          <span style={{ fg: statusColor() }}>{statusIndicator()} </span>
        </Show>
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
          <span style={{ fg: "#888888" }}>⎿ {diffSummary()}</span>
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
    </box>
  );
}
