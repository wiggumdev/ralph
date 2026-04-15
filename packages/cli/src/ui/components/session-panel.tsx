import { For, Show } from "solid-js";
import type { TodoItem } from "#parsers/message-types";

export interface SessionPanelProps {
  iteration: number;
  maxIterations: number;
  sessionId?: string;
  todos: TodoItem[];
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

export function SessionPanel(props: SessionPanelProps) {
  return (
    <box flexDirection="column" style={{ paddingTop: 1 }}>
      {/* Session info line */}
      <text>
        <span style={{ fg: "#888888" }}>Iteration: </span>
        <span>
          {props.iteration}/{props.maxIterations}
        </span>
        <Show when={props.sessionId}>
          <span style={{ fg: "#444444" }}> | </span>
          <span style={{ fg: "#888888" }}>ID: </span>
          <span style={{ fg: "#606060" }}>
            {props.sessionId?.slice(0, 12)}...
          </span>
        </Show>
      </text>

      {/* Task list - one per line */}
      <Show when={props.todos.length > 0}>
        <For each={props.todos}>
          {(todo) => (
            <text>
              <span style={{ fg: getTodoColor(todo.status) }}>
                {getTodoIcon(todo.status)}
              </span>
              <span style={{ fg: "#aaaaaa" }}> {todo.content}</span>
            </text>
          )}
        </For>
      </Show>
    </box>
  );
}
