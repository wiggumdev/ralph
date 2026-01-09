import { Show } from "solid-js";
import type { ResultMessage as ResultMessageType } from "#parsers/message-types";

export interface ResultMessageProps {
  message: ResultMessageType;
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function ResultMessage(props: ResultMessageProps) {
  const subtypeColor = () => {
    switch (props.message.subtype) {
      case "success":
        return "#00ff00";
      case "error_max_turns":
        return "#ffff00";
      case "error_during_execution":
        return "#ff0000";
      default:
        return "#888888";
    }
  };

  const subtypeIcon = () => {
    switch (props.message.subtype) {
      case "success":
        return "\u2713";
      case "error_max_turns":
        return "\u26a0";
      case "error_during_execution":
        return "\u2717";
      default:
        return "\u25cb";
    }
  };

  return (
    <box flexDirection="column" style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: subtypeColor() }}>[{subtypeIcon()} RESULT]</span>
        <span style={{ fg: "#888888" }}>
          {" "}
          {props.message.subtype.replace(/_/g, " ")}
        </span>
      </text>

      <Show
        when={
          props.message.usage ||
          props.message.total_cost_usd !== undefined ||
          props.message.duration_ms
        }
      >
        <box style={{ marginLeft: 2 }}>
          <text>
            <Show when={props.message.usage}>
              <span style={{ fg: "#00aaff" }}>
                Tokens: {formatTokens(props.message.usage!.input_tokens)} in /{" "}
                {formatTokens(props.message.usage!.output_tokens)} out
              </span>
            </Show>
            <Show when={props.message.total_cost_usd !== undefined}>
              <span style={{ fg: "#ffaa00" }}>
                {props.message.usage ? " | " : ""}Cost:{" "}
                {formatCost(props.message.total_cost_usd!)}
              </span>
            </Show>
            <Show when={props.message.duration_ms}>
              <span style={{ fg: "#888888" }}>
                {props.message.usage ||
                props.message.total_cost_usd !== undefined
                  ? " | "
                  : ""}
                Duration: {formatDuration(props.message.duration_ms!)}
              </span>
            </Show>
          </text>
        </box>
      </Show>

      <Show when={props.message.result}>
        <box style={{ marginLeft: 2, marginTop: 1 }}>
          <text>
            <span style={{ fg: "#aaaaaa" }}>{props.message.result}</span>
          </text>
        </box>
      </Show>
    </box>
  );
}
