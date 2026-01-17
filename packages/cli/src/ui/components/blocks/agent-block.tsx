import { For, Show } from "solid-js";
import type { AgentBlock as AgentBlockType } from "#parsers/message-types";
import { isAgentItem, isToolItem } from "#parsers/message-types";
import { ToolBlock } from "./tool-block";

export interface AgentBlockProps {
  block: AgentBlockType;
  expanded: boolean;
}

const CYAN = "#56b6c2";
const COLLAPSED_PREVIEW_LENGTH = 40;

function getStatusIndicator(status: AgentBlockType["status"]): string {
  switch (status) {
    case "pending":
      return "\u25cb";
    case "in_progress":
      return "\u25d0";
    case "completed":
      return "\u2713";
    case "failed":
      return "\u2717";
    default:
      return "";
  }
}

function getStatusColor(status: AgentBlockType["status"]): string {
  switch (status) {
    case "pending":
      return "#666666";
    case "in_progress":
      return "#f5a742";
    case "completed":
      return "#7fd88f";
    case "failed":
      return "#ff6666";
    default:
      return "#666666";
  }
}

export function AgentBlock(props: AgentBlockProps) {
  const isExpanded = () => props.expanded;

  const title = () => props.block.title;
  const preview = () => {
    const t = title();
    if (t.length <= COLLAPSED_PREVIEW_LENGTH) {
      return t;
    }
    return `${t.slice(0, COLLAPSED_PREVIEW_LENGTH)}...`;
  };

  // Count different item types
  const toolCount = () =>
    props.block.items.filter((item) => isToolItem(item)).length;
  const nestedAgentCount = () =>
    props.block.items.filter((item) => isAgentItem(item)).length;
  const otherCount = () =>
    props.block.items.filter((item) => !(isToolItem(item) || isAgentItem(item)))
      .length;

  const stats = () => {
    const parts: string[] = [];
    if (otherCount() > 0) {
      parts.push(`${otherCount()} msg`);
    }
    if (toolCount() > 0) {
      parts.push(`${toolCount()} tool`);
    }
    if (nestedAgentCount() > 0) {
      parts.push(`${nestedAgentCount()} agent`);
    }
    return parts.length > 0 ? `(${parts.join(", ")})` : "";
  };

  return (
    <box flexDirection="column" style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: getStatusColor(props.block.status) }}>
          {getStatusIndicator(props.block.status)}{" "}
        </span>
        <span style={{ fg: CYAN }}>
          {isExpanded() ? "\u25bc" : "\u25b6"} ◇ Agent
        </span>
        <Show when={!isExpanded()}>
          <span style={{ fg: "#888888" }}> {preview()}</span>
        </Show>
        <Show when={isExpanded()}>
          <span style={{ fg: "#ffffff" }}> {title()}</span>
        </Show>
        <Show when={stats()}>
          <span style={{ fg: "#666666" }}> {stats()}</span>
        </Show>
      </text>

      <Show when={isExpanded()}>
        <box flexDirection="column" style={{ paddingLeft: 2, marginTop: 0 }}>
          {/* Render all items - tools and nested agents */}
          <For each={props.block.items}>
            {(item) => (
              <>
                <Show when={isToolItem(item)}>
                  <ToolBlock
                    block={
                      item.data as import("#parsers/message-types").ToolBlock
                    }
                    expanded={props.expanded}
                  />
                </Show>
                <Show when={isAgentItem(item)}>
                  <AgentBlock
                    block={
                      item.data as import("#parsers/message-types").AgentBlock
                    }
                    expanded={props.expanded}
                  />
                </Show>
              </>
            )}
          </For>
        </box>
      </Show>
    </box>
  );
}
