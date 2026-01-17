import { useAppState } from "#ui/contexts/app-state-context";

export function Progress() {
  const { iteration, maxIterations } = useAppState();

  const progressBar = () => {
    const width = 20;
    const filled = Math.round((iteration() / maxIterations()) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  };

  return (
    <text>
      <span style={{ fg: "#00aaff" }}>
        {iteration()}/{maxIterations()}
      </span>
      <span style={{ fg: "#666666" }}>{progressBar()}</span>
    </text>
  );
}
