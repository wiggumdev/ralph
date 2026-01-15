import type { Accessor, JSX } from "solid-js";
import { LoopHeader } from "./loop-header";

interface LoopTabProps {
  iteration: Accessor<number>;
  maxIterations: number;
  progressBar: string;
  children: JSX.Element;
}

export function LoopTab(props: LoopTabProps) {
  return (
    <box flexDirection="column" style={{ flexGrow: 1 }}>
      <LoopHeader
        iteration={props.iteration}
        maxIterations={props.maxIterations}
        progressBar={props.progressBar}
      />
      <box flexDirection="column" style={{ flexGrow: 1, marginTop: 1 }}>
        {props.children}
      </box>
    </box>
  );
}
