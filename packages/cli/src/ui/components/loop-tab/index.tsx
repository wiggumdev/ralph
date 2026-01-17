import type { JSX } from "solid-js";

interface LoopTabProps {
  children: JSX.Element;
}

export function LoopTab(props: LoopTabProps) {
  return (
    <box flexDirection="column" style={{ flexGrow: 1 }}>
      <box flexDirection="column" style={{ flexGrow: 1, marginTop: 1 }}>
        {props.children}
      </box>
    </box>
  );
}
