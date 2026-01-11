import type { Accessor } from "solid-js";
import { Show } from "solid-js";

export type TabView = "output" | "progress" | "prd";

interface TabBarProps {
  currentTab: Accessor<TabView>;
  prdHelpText: Accessor<string>;
}

export function TabBar(props: TabBarProps) {
  return (
    <box>
      <text>
        <span
          style={{
            fg: props.currentTab() === "output" ? "#00ff00" : "#666666",
          }}
        >
          {props.currentTab() === "output" ? "▶ " : "  "}
          Output
        </span>
        <span style={{ fg: "#666666" }}> | </span>
        <span
          style={{
            fg: props.currentTab() === "progress" ? "#00ff00" : "#666666",
          }}
        >
          {props.currentTab() === "progress" ? "▶ " : "  "}
          Progress
        </span>
        <span style={{ fg: "#666666" }}> | </span>
        <span
          style={{
            fg: props.currentTab() === "prd" ? "#00ff00" : "#666666",
          }}
        >
          {props.currentTab() === "prd" ? "▶ " : "  "}
          PRD
        </span>
        <Show when={props.currentTab() === "prd"}>
          <span style={{ fg: "#666666" }}> | {props.prdHelpText()}</span>
        </Show>
      </text>
    </box>
  );
}
