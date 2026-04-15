import { type JSX, Show } from "solid-js";

interface ModalProps {
  visible: boolean;
  children: JSX.Element;
  width?: number | "auto" | `${number}%`;
}

export function Modal(props: ModalProps) {
  return (
    <Show when={props.visible}>
      <box
        alignItems="center"
        justifyContent="center"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000000cc",
        }}
      >
        <box
          border
          borderColor="#444444"
          borderStyle="single"
          flexDirection="column"
          style={{
            backgroundColor: "#1a1a1a",
            padding: 2,
          }}
          width={props.width ?? "60%"}
        >
          {props.children}
        </box>
      </box>
    </Show>
  );
}
