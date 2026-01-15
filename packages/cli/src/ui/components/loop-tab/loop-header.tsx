import type { Accessor } from "solid-js";

interface LoopHeaderProps {
  iteration: Accessor<number>;
  maxIterations: number;
  progressBar: string;
}

export function LoopHeader(props: LoopHeaderProps) {
  return (
    <box>
      <text>
        <span style={{ fg: "#00aaff" }}>
          Loop {props.iteration()} of {props.maxIterations}
        </span>
        <span style={{ fg: "#666666" }}> [{props.progressBar}]</span>
      </text>
    </box>
  );
}
