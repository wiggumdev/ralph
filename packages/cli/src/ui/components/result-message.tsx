import { Show } from "solid-js";
import type { ResultMessage as ResultMessageType } from "#parsers/message-types";

export interface ResultMessageProps {
  message: ResultMessageType;
}

export function ResultMessage(props: ResultMessageProps) {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  return (
    <box style={{ marginBottom: 1 }}>
      <text>
        <span
          style={{
            fg: props.message.complete ? "#00ff00" : "#ffaa00",
            bold: true,
          }}
        >
          [{props.message.complete ? "COMPLETE" : "RESULT"}]
        </span>
        <Show when={props.message.subtype}>
          <span style={{ fg: "#888888" }}> {props.message.subtype}</span>
        </Show>
        <Show when={props.message.duration_ms}>
          <span style={{ fg: "#666666" }}>
            {" "}
            Duration: {formatDuration(props.message.duration_ms!)}
          </span>
        </Show>
        <Show when={props.message.total_cost_usd}>
          <span style={{ fg: "#666666" }}>
            {" "}
            Cost: {formatCost(props.message.total_cost_usd!)}
          </span>
        </Show>
        <Show when={props.message.usage}>
          <span style={{ fg: "#666666" }}>
            {" "}
            Tokens: {props.message.usage!.input_tokens}↓{" "}
            {props.message.usage!.output_tokens}↑
          </span>
        </Show>
      </text>
      <Show when={props.message.result}>
        <text style={{ fg: "#aaaaaa", marginLeft: 2 }}>
          {props.message.result}
        </text>
      </Show>
    </box>
  );
}
