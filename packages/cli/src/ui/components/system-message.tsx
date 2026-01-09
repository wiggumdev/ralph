import { Show } from "solid-js";
import type { SystemMessage as SystemMessageType } from "#parsers/message-types";

export interface SystemMessageProps {
  message: SystemMessageType;
}

export function SystemMessage(props: SystemMessageProps) {
  return (
    <box style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: "#666666" }}>[SYSTEM]</span>
        <Show when={props.message.session_id}>
          <span style={{ fg: "#888888" }}>
            {" "}
            Session: {props.message.session_id}
          </span>
        </Show>
        <Show when={props.message.model}>
          <span style={{ fg: "#888888" }}> Model: {props.message.model}</span>
        </Show>
      </text>
    </box>
  );
}
