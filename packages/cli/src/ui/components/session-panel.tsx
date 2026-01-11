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
    <box
      border
      flexDirection="column"
      style={{ width: 35, paddingLeft: 1, paddingRight: 1 }}
    >
      <text>
        <span style={{ bold: true }}>Session</span>
      </text>

      <text>
        <span style={{ fg: "#888888" }}>Iteration: </span>
        <span>
          {props.iteration}/{props.maxIterations}
        </span>
      </text>

      <Show when={props.sessionId}>
        <text>
          <span style={{ fg: "#888888" }}>ID: </span>
          <span style={{ fg: "#606060" }}>
            {props.sessionId?.slice(0, 20)}...
          </span>
        </text>
      </Show>

      <text style={{ fg: "#444444" }}>───────────────────────────</text>

      <text>
        <span style={{ bold: true }}>Tasks</span>
      </text>

      <scrollbox style={{ flexGrow: 1 }}>
        <Show
          fallback={<text style={{ fg: "#666666" }}>No tasks</text>}
          when={props.todos.length > 0}
        >
          <For each={props.todos}>
            {(todo) => (
              <text>
                <span style={{ fg: getTodoColor(todo.status) }}>
                  {getTodoIcon(todo.status)}{" "}
                </span>
                <span style={{ fg: "#aaaaaa" }}>{todo.content}</span>
              </text>
            )}
          </For>
        </Show>
      </scrollbox>
    </box>
  );
}
