import { Show } from "solid-js";
import { useAppState } from "#ui/contexts/app-state-context";

export function Progress() {
  const { iteration, maxIterations } = useAppState();

  const progressBar = () => {
    const max = maxIterations();
    if (max === undefined) {
      return "";
    }
    const width = 20;
    const filled = Math.round((iteration() / max) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  };

  return (
    <text>
      <span style={{ fg: "#00aaff" }}>
        <Show
          fallback={`${iteration()} ∞`}
          when={maxIterations() !== undefined}
        >
          {iteration()}/{maxIterations()}
        </Show>
      </span>
      <Show when={maxIterations() !== undefined}>
        <span style={{ fg: "#666666" }}> {progressBar()} </span>
      </Show>
    </text>
  );
}
