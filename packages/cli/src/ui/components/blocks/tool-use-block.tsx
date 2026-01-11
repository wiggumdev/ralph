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
  switch (name) {
    case "Read":
    case "Edit":
    case "Write":
      return (input.file_path as string) || "";
    case "Grep": {
      const pattern = input.pattern as string;
      const path = input.path as string;
      return path ? `pattern: "${pattern}", path: "${path}"` : `"${pattern}"`;
    }
    case "Glob":
      return (input.pattern as string) || "";
    case "Bash": {
      const cmd = (input.command as string) || "";
      return cmd.length > 60 ? `${cmd.slice(0, 60)}...` : cmd;
    }
    case "Task":
      return (input.description as string) || "";
    case "TodoWrite":
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

export function ToolUseBlock(props: ToolUseBlockProps) {
  const inputJson = () => JSON.stringify(props.block.input, null, 2);
  const input = () => props.block.input as Record<string, unknown>;

  const keyParam = () => getKeyParam(props.block.name, input());

  const isTodoWrite = () => props.block.name === "TodoWrite";
  const todos = () => (input().todos as TodoItem[]) || [];

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

      <Show when={props.expanded && !isTodoWrite()}>
        <box
          border
          style={{
            paddingLeft: 1,
            marginTop: 1,
            marginLeft: 2,
            backgroundColor: "#1a1a1a",
          }}
        >
          <text>{inputJson()}</text>
        </box>
      </Show>
    </box>
  );
}
