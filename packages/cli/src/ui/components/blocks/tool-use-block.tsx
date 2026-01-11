import { diffLines as computeDiff } from "diff";
import { For, Show } from "solid-js";
import type { ToolUseBlock as ToolUseBlockType } from "#parsers/message-types";

export interface ToolUseBlockProps {
  block: ToolUseBlockType;
  expanded: boolean;
}

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

interface DiffLine {
  lineNum: string;
  prefix: string;
  content: string;
  color: string;
}

function getToolIcon(name: string): string {
  switch (name.toLowerCase()) {
    case "glob":
      return "✱";
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

function getToolColor(name: string): string {
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

function getTodoIcon(status: string): string {
  switch (status) {
    case "completed":
      return "☑";
    case "in_progress":
      return "◐";
    default:
      return "☐";
  }
}

function getTodoColor(status: string): string {
  switch (status) {
    case "completed":
      return "#00ff00";
    case "in_progress":
      return "#ffff00";
    default:
      return "#888888";
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
  const input = () => props.block.input as Record<string, unknown>;

  const toolName = () => props.block.name.toLowerCase();
  const params = () => formatParams(props.block.name, input());
  const icon = () => getToolIcon(props.block.name);
  const iconColor = () => getToolColor(props.block.name);
  const isTodoWrite = () =>
    toolName() === "todowrite" || toolName() === "todo_write";
  const todos = () => (input().todos as TodoItem[]) || [];

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
        <span style={{ fg: iconColor() }}>{icon()} </span>
        <span style={{ fg: "#808080" }}>{toolName()}</span>
        <Show when={params()}>
          <span style={{ fg: "#606060" }}> {params()}</span>
        </Show>
      </text>

      <Show when={isTodoWrite()}>
        <box flexDirection="column" style={{ marginLeft: 2 }}>
          <For each={todos()}>
            {(todo) => (
              <text>
                <span style={{ fg: getTodoColor(todo.status) }}>
                  {getTodoIcon(todo.status)}{" "}
                </span>
                <span style={{ fg: "#aaaaaa" }}>{todo.content}</span>
              </text>
            )}
          </For>
        </box>
      </Show>

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
