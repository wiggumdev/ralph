import type { Accessor } from "solid-js";
import { For, Show } from "solid-js";
import type { LoopResult } from "#ui/ralph-app";
import { formatCost, formatTokens } from "#utils/format";
import type { TodoItem } from "./session-panel";

interface FooterPanelProps {
  icon: string;
  status: "running" | "complete" | "error" | "idle";
  statusIcon: string | undefined;
  statusColor: string;
  iteration: Accessor<number>;
  maxIterations: number;
  progressBar: string;
  exitReason: Accessor<LoopResult["exitReason"]>;
  lastSessionId: Accessor<string | undefined>;
  adapterName: string;
  showUsage: boolean;
  totalInputTokens: Accessor<number>;
  totalOutputTokens: Accessor<number>;
  totalCost: Accessor<number>;
  todos: Accessor<TodoItem[]>;
}

function getTodoIcon(todoStatus: string): string {
  switch (todoStatus) {
    case "completed":
      return "☑";
    case "in_progress":
      return "◐";
    default:
      return "☐";
  }
}

function getTodoColor(todoStatus: string): string {
  switch (todoStatus) {
    case "completed":
      return "#00ff00";
    case "in_progress":
      return "#ffff00";
    default:
      return "#888888";
  }
}

/** Check if adapter supports --resume and session exists */
export function shouldShowOpenHint(
  sessionId: string | undefined,
  adapterName: string
): boolean {
  const supportsResume = adapterName === "claude" || adapterName === "opencode";
  return !!sessionId && supportsResume;
}

export function FooterPanel(props: FooterPanelProps) {
  const hasUsageData = () =>
    props.showUsage &&
    (props.totalInputTokens() > 0 ||
      props.totalOutputTokens() > 0 ||
      props.totalCost() > 0);

  return (
    <box flexDirection="column" style={{ paddingTop: 1, flexGrow: 1 }}>
      {/* Header + progress bar combined */}
      <box flexDirection="column">
        <text>
          <span style={{ fg: "#00aaff" }}>{props.icon}</span>{" "}
          <strong>Ralph Agentic Loop</strong>{" "}
          <span style={{ fg: props.statusColor }}>{props.statusIcon}</span>{" "}
          Iteration {props.iteration()}/{props.maxIterations}{" "}
          <span style={{ fg: "#666666" }}>{props.progressBar}</span>
          <span style={{ fg: "#666666" }}> | [e] expand [q] quit</span>
          <Show
            when={shouldShowOpenHint(props.lastSessionId(), props.adapterName)}
          >
            <span style={{ fg: "#666666" }}> [o] open</span>
          </Show>
        </text>
      </box>
      {/* Session line */}
      <Show when={props.lastSessionId()}>
        <box flexDirection="column" style={{ paddingTop: 1 }}>
          <text>
            <span style={{ fg: "#888888" }}>Session: </span>
            <span style={{ fg: "#606060" }}>{props.lastSessionId()}</span>
            <Show when={hasUsageData()}>
              <span style={{ fg: "#444444" }}> | </span>
              <span style={{ fg: "#888888" }}>Tokens: </span>
              <span style={{ fg: "#00aaff" }}>
                {formatTokens(props.totalInputTokens())} in /{" "}
                {formatTokens(props.totalOutputTokens())} out
              </span>
              <Show when={props.totalCost() > 0}>
                <span style={{ fg: "#ffaa00" }}>
                  {" "}
                  | {formatCost(props.totalCost())}
                </span>
              </Show>
            </Show>
          </text>
        </box>
      </Show>

      {/* Status messages */}
      <Show
        when={props.status === "complete" && props.exitReason() === "complete"}
      >
        <box flexDirection="column" style={{ paddingTop: 1, flexGrow: 1 }}>
          <text>
            <span style={{ fg: "#00ff00" }}>
              ✓ Task marked complete by agent
            </span>
          </text>
        </box>
      </Show>
      <Show
        when={
          props.status === "complete" && props.exitReason() === "max_iterations"
        }
      >
        <box flexDirection="column" style={{ paddingTop: 1, flexGrow: 1 }}>
          <text>
            <span style={{ fg: "#ffff00" }}>
              ⚠ Reached max iterations ({props.maxIterations})
            </span>
          </text>
        </box>
      </Show>
      <Show when={props.status === "error"}>
        <box flexDirection="column" style={{ paddingTop: 1, flexGrow: 1 }}>
          <text>
            <span style={{ fg: "#ff0000" }}>
              ✗ Error in iteration {props.iteration()}
            </span>
          </text>
        </box>
      </Show>

      {/* Tasks with title */}
      <Show when={props.todos().length > 0}>
        <box flexDirection="column">
          <text>
            <span style={{ fg: "#888888" }}>Todo:</span>
          </text>
          <For each={props.todos()}>
            {(todo) => (
              <text>
                <span style={{ fg: getTodoColor(todo.status) }}>
                  {getTodoIcon(todo.status)}
                </span>
                <span style={{ fg: "#aaaaaa" }}> {todo.content}</span>
              </text>
            )}
          </For>
        </box>
      </Show>
    </box>
  );
}
