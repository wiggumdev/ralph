import { For, Show } from "solid-js";
import type { AgentBlock as AgentBlockType } from "#parsers/message-types";
import "opentui-spinner/solid";
import { isAgentItem, isToolItem } from "#parsers/message-types";
import {
  CYAN,
  getStatusColor,
  getStatusIndicator,
  truncatePreview,
} from "./agent-block-utils";
import { ToolBlock } from "./tool-block";

export interface AgentBlockProps {
  block: AgentBlockType;
  cwd?: string;
  expanded: boolean;
}

export function AgentBlock(props: AgentBlockProps) {
  const isActive = () =>
    props.block.status === "pending" || props.block.status === "in_progress";
  const isExpanded = () => props.expanded;

  const title = () => props.block.title;
  const preview = () => truncatePreview(title());

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
      <box alignItems="center" flexDirection="row">
        <Show
          fallback={
            <text>
              <span style={{ fg: getStatusColor(props.block.status) }}>
                {getStatusIndicator(props.block.status)}{" "}
              </span>
            </text>
          }
          when={isActive()}
        >
          <spinner color={getStatusColor(props.block.status)} name="dots" />
        </Show>
        <text>
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
      </box>

      <Show when={isExpanded()}>
        <box
          border={["left"]}
          borderColor={"#00aaff"}
          flexDirection="column"
          style={{ marginLeft: 2, paddingLeft: 2 }}
        >
          {/* Render all items - tools and nested agents */}
          <For each={props.block.items}>
            {(item) => (
              <>
                <Show when={isToolItem(item)}>
                  <ToolBlock
                    block={
                      item.data as import("#parsers/message-types").ToolBlock
                    }
                    cwd={props.cwd}
                    expanded={props.expanded}
                  />
                </Show>
                <Show when={isAgentItem(item)}>
                  <AgentBlock
                    block={
                      item.data as import("#parsers/message-types").AgentBlock
                    }
                    cwd={props.cwd}
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
