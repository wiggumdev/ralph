import type { Accessor } from "solid-js";
import { Progress } from "./progress";

export type TabView = "loop" | "learning" | "backlog";

interface TabBarProps {
  currentTab: Accessor<TabView>;
}

export function TabBar(props: TabBarProps) {
  const isActive = (tab: TabView) => props.currentTab() === tab;

  return (
    <box flexDirection="row">
      <text>↻ Ralph </text>
      <Progress />
      <text>
        <span style={{ fg: isActive("loop") ? "#00ff00" : "#666666" }}>
          [1] Loop
        </span>
        <span style={{ fg: "#666666" }}> | </span>
        <span style={{ fg: isActive("learning") ? "#00ff00" : "#666666" }}>
          [2] Learning
        </span>
        <span style={{ fg: "#666666" }}> | </span>
        <span style={{ fg: isActive("backlog") ? "#00ff00" : "#666666" }}>
          [3] Backlog
        </span>
        <span style={{ fg: "#666666" }}> |</span>
      </text>
    </box>
  );
}
