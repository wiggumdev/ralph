import { For, Show } from "solid-js";
import type { PlanEntry, PlanEntryPriority } from "#parsers/message-types";

export interface AgentPlanProps {
  plan: PlanEntry[];
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓";
    case "in_progress":
      return "◐";
    default:
      return "○";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#00ff00";
    case "in_progress":
      return "#00aaff";
    default:
      return "#666666";
  }
}

function getPriorityIndicator(priority: PlanEntryPriority): string {
  switch (priority) {
    case "high":
      return "!";
    case "medium":
      return "·";
    default:
      return " ";
  }
}

function getPriorityColor(priority: PlanEntryPriority): string {
  switch (priority) {
    case "high":
      return "#ff6666";
    case "medium":
      return "#ffaa00";
    default:
      return "#666666";
  }
}

export function AgentPlan(props: AgentPlanProps) {
  return (
    <Show when={props.plan.length > 0}>
      <box flexDirection="column" style={{ marginTop: 1, marginBottom: 1 }}>
        <text>
          <span style={{ fg: "#888888" }}>Plan:</span>
        </text>
        <For each={props.plan}>
          {(entry) => (
            <text>
              <span style={{ fg: getStatusColor(entry.status) }}>
                {getStatusIcon(entry.status)}
              </span>
              <span style={{ fg: getPriorityColor(entry.priority) }}>
                {getPriorityIndicator(entry.priority)}
              </span>
              <span
                style={{
                  fg: entry.status === "completed" ? "#666666" : "#cccccc",
                }}
              >
                {" "}
                {entry.content}
              </span>
            </text>
          )}
        </For>
      </box>
    </Show>
  );
}
