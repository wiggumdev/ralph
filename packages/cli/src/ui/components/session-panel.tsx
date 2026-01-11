import { For, Show } from "solid-js";

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

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
    <box flexDirection="row" style={{ paddingTop: 1 }}>
      <text>
        <span style={{ fg: "#888888" }}>Iteration: </span>
        <span>
          {props.iteration}/{props.maxIterations}
        </span>
      </text>
      <Show when={props.sessionId}>
        <text>
          <span style={{ fg: "#444444" }}> | </span>
          <span style={{ fg: "#888888" }}>ID: </span>
          <span style={{ fg: "#606060" }}>
            {props.sessionId?.slice(0, 12)}...
          </span>
        </text>
      </Show>
      <Show when={props.todos.length > 0}>
        <text>
          <span style={{ fg: "#444444" }}> | </span>
          <span style={{ fg: "#888888" }}>Tasks: </span>
          <For each={props.todos}>
            {(todo, index) => (
              <>
                <span style={{ fg: getTodoColor(todo.status) }}>
                  {getTodoIcon(todo.status)}
                </span>
                <span style={{ fg: "#aaaaaa" }}>
                  {" "}
                  {todo.content.length > 20
                    ? `${todo.content.slice(0, 20)}...`
                    : todo.content}
                </span>
                <Show when={index() < props.todos.length - 1}>
                  <span style={{ fg: "#444444" }}> | </span>
                </Show>
              </>
            )}
          </For>
        </text>
      </Show>
    </box>
  );
}
