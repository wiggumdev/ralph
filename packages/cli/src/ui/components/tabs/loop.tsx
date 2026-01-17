import type { JSX } from "solid-js";

interface LoopTabProps {
  children: JSX.Element;
}

export function LoopTab(props: LoopTabProps) {
  return (
    <box flexDirection="column" style={{ flexGrow: 1 }}>
      {props.children}
    </box>
  );
}
