import { Show } from "solid-js";
import type { ResultMessage as ResultMessageType } from "#parsers/message-types";

export interface ResultMessageProps {
  message: ResultMessageType;
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

  return (
    <box flexDirection="column">
      <Show when={props.message.result}>
        <text>
          <span style={{ fg: subtypeColor() }}>● </span>
          <span style={{ fg: "#aaaaaa" }}>{props.message.result}</span>
        </text>
      </Show>
    </box>
  );
}
