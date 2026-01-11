import { createTwoFilesPatch } from "diff";
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

function getKeyParam(name: string, input: Record<string, unknown>): string {
  const lowerName = name.toLowerCase();
  switch (lowerName) {
    case "read":
    case "edit":
    case "write":
      return (input.file_path as string) || "";
    case "grep": {
      const pattern = input.pattern as string;
      const path = input.path as string;
      return path ? `pattern: "${pattern}", path: "${path}"` : `"${pattern}"`;
    }
    case "glob":
      return (input.pattern as string) || "";
    case "bash": {
      const cmd = (input.command as string) || "";
      return cmd.length > 60 ? `${cmd.slice(0, 60)}...` : cmd;
    }
    case "task":
      return (input.description as string) || "";
    case "todowrite":
    case "todo_write":
      return "";
    default: {
      for (const val of Object.values(input)) {
        if (typeof val === "string" && val.length > 0) {
          return val.length > 60 ? `${val.slice(0, 60)}...` : val;
        }
      }
      return "";
    }
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

function getDiffLineColor(line: string): string {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "#00ff00";
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return "#ff6666";
  }
  if (line.startsWith("@@")) {
    return "#00aaff";
  }
  return "#888888";
}

export function ToolUseBlock(props: ToolUseBlockProps) {
  const input = () => props.block.input as Record<string, unknown>;

  const keyParam = () => getKeyParam(props.block.name, input());

  const toolName = () => props.block.name.toLowerCase();
  const isTodoWrite = () =>
    toolName() === "todowrite" || toolName() === "todo_write";
  const todos = () => (input().todos as TodoItem[]) || [];

  const isEdit = () => toolName() === "edit";
  const diffLines = () => {
    if (!isEdit()) {
      return [];
    }
    const oldStr = (input().old_string as string) || "";
    const newStr = (input().new_string as string) || "";
    const filePath = (input().file_path as string) || "file";
    const patch = createTwoFilesPatch(filePath, filePath, oldStr, newStr);
    // Skip first 4 header lines, get actual diff
    return patch.split("\n").slice(4);
  };

  return (
    <box flexDirection="column">
      <text>
        <span style={{ fg: "#00ff00" }}>● </span>
        <span style={{ bold: true }}>{props.block.name}</span>
        <Show when={keyParam()}>
          <span style={{ fg: "#888888" }}>({keyParam()})</span>
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

      <Show when={isEdit() && diffLines().length > 0}>
        <box flexDirection="column" style={{ marginLeft: 2 }}>
          <For each={diffLines()}>
            {(line) => (
              <text>
                <span style={{ fg: getDiffLineColor(line) }}>{line}</span>
              </text>
            )}
          </For>
        </box>
      </Show>
    </box>
  );
}
