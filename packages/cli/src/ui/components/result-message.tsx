import { Show } from "solid-js";
import type { ResultMessage as ResultMessageType } from "#parsers/message-types";

export interface ResultMessageProps {
  message: ResultMessageType;
}

export function ResultMessage(props: ResultMessageProps) {
  const statusColor = () => {
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

  const statusIcon = () => {
    switch (props.message.subtype) {
      case "success":
        return "✓";
      case "error_max_turns":
        return "⚠";
      case "error_during_execution":
        return "✗";
      default:
        return "○";
    }
  };

  return (
    <box style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: statusColor() }}>[{statusIcon()} RESULT]</span>
        <span style={{ fg: statusColor() }}> {props.message.subtype}</span>
        <Show when={props.message.duration_ms}>
          <span style={{ fg: "#888888" }}>
            {" "}
            ({(props.message.duration_ms! / 1000).toFixed(1)}s)
          </span>
        </Show>
        <Show when={props.message.usage}>
          <span style={{ fg: "#888888" }}>
            {" "}
            [{props.message.usage!.input_tokens}↓ {props.message.usage!.output_tokens}↑]
          </span>
        </Show>
        <Show when={props.message.total_cost_usd}>
          <span style={{ fg: "#888888" }}>
            {" "}
            ${props.message.total_cost_usd!.toFixed(4)}
          </span>
        </Show>
      </text>
    </box>
  );
}
