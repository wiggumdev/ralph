import { createEffect, For, Match, Show, Switch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type {
  Message,
  ResultMessage as ResultMessageType,
  SessionState,
  SystemMessage,
  TextDelta,
  ThinkingDelta,
} from "#parsers/message-types";
import {
  isAgentItem,
  isMessageItem,
  isResultItem,
  isSystemItem,
  isTextDeltaItem,
  isThinkingDeltaItem,
  isToolItem,
} from "#parsers/message-types";
import { getSessionTitle } from "#utils/session-title";
import { AgentPlan } from "./agent-plan";
import { AgentBlock } from "./blocks/agent-block";
import { SystemMessageBlock } from "./blocks/system-message-block";
import { TextDeltaBlock } from "./blocks/text-delta-block";
import { ThinkingBlock } from "./blocks/thinking-block";
import { ToolBlock } from "./blocks/tool-block";
import { MessageItem } from "./message-item";
import { ResultMessage } from "./result-message";

export interface SessionContainerProps {
  session: SessionState;
  expanded: boolean;
  selected?: boolean;
  canOpen?: boolean;
  loopState?: string;
  onToggle: () => void;
}

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  thinking: { icon: "\u25c7", color: "#9d7cd8" },
  responding: { icon: "\u25c9", color: "#00aaff" },
  tool_executing: { icon: "\u26a1", color: "#f5a742" },
  waiting: { icon: "\u25cc", color: "#808080" },
};

const LOOP_STATE_COLORS: Record<string, string> = {
  initializing: "#f5a742",
  prompting: "#f5a742",
  streaming: "#00aaff",
  thinking: "#c792ea",
  tool_executing: "#f78c6c",
  completing: "#00aaff",
};

export function SessionContainer(props: SessionContainerProps) {
  // Local stores for granular reactivity
  const [items, setItems] = createStore(props.session.items);

  // Sync items when props change
  createEffect(() => {
    setItems(reconcile(props.session.items, { key: "id" }));
  });

  const title = () => getSessionTitle(props.session);
  const sessionId = () => props.session.id.slice(0, 16);

  const statusIcon = () => {
    switch (props.session.status) {
      case "running":
        return "↻";
      case "complete":
        return "↻";
      case "error":
        return "✗";
      case "paused":
        return "⏸";
      case "stopped":
        return "⏹";
      default:
        return "?";
    }
  };

  const statusColor = () => {
    switch (props.session.status) {
      case "running":
        return "#00aaff";
      case "complete":
        return "#333333";
      case "error":
        return "#ff0000";
      case "paused":
        return "#ffff00";
      case "stopped":
        return "#ffaa00";
      default:
        return "#808080";
    }
  };

  const activityIndicator = () => {
    const activity = props.session.activity;
    if (activity === "idle" || !activity) {
      return null;
    }
    return ACTIVITY_ICONS[activity] ?? null;
  };

  const rowColor = () => (props.selected ? "#ffffff" : "#00aaff");

  return (
    <box>
      <text>
        <span style={{ fg: statusColor() }}>{statusIcon()}</span>
        <Show when={activityIndicator()}>
          {(indicator: () => { icon: string; color: string }) => (
            <span style={{ fg: indicator().color }}> {indicator().icon}</span>
          )}
        </Show>
        <Show when={props.loopState && props.session.status === "running"}>
          <span
            style={{ fg: LOOP_STATE_COLORS[props.loopState!] ?? "#808080" }}
          >
            {" "}
            {props.loopState}
          </span>
        </Show>
        <span style={{ fg: rowColor() }}> Loop {props.session.iteration}</span>
        <Show when={title()}>
          <span style={{ fg: "#ffffff" }}>: {title()}</span>
        </Show>
        <span style={{ fg: "#606060" }}> {sessionId()}</span>
        <Show when={props.selected}>
          <span style={{ fg: "#333333" }}>
            {" "}
            [l] expand [h] collapse{props.canOpen && " [o] open"}{" "}
            {props.session.status === "running" && "[p] pause"}
            {props.session.status === "paused" && "[p] resume"}
          </span>
        </Show>
      </text>

      <Show when={!props.session.collapsed}>
        <box
          border={["left"]}
          borderColor={"#00aaff"}
          style={{ marginLeft: 2, paddingLeft: 2 }}
        >
          {/* Render items via local store for granular reactivity */}
          <For each={items}>
            {(item) => (
              <box>
                <Switch>
                  <Match when={isMessageItem(item)}>
                    <MessageItem
                      expanded={props.expanded}
                      message={item.data as Message}
                    />
                  </Match>
                  <Match when={isResultItem(item)}>
                    <ResultMessage message={item.data as ResultMessageType} />
                  </Match>
                  <Match when={isTextDeltaItem(item)}>
                    <TextDeltaBlock message={item.data as TextDelta} />
                  </Match>
                  <Match when={isThinkingDeltaItem(item)}>
                    <ThinkingBlock
                      block={item.data as ThinkingDelta}
                      expanded={props.expanded}
                    />
                  </Match>
                  <Match when={isSystemItem(item)}>
                    <SystemMessageBlock message={item.data as SystemMessage} />
                  </Match>
                  <Match when={isToolItem(item)}>
                    <ToolBlock
                      block={
                        item.data as import("#parsers/message-types").ToolBlock
                      }
                      expanded={props.expanded}
                    />
                  </Match>
                  <Match when={isAgentItem(item)}>
                    <AgentBlock
                      block={
                        item.data as import("#parsers/message-types").AgentBlock
                      }
                      expanded={props.expanded}
                    />
                  </Match>
                </Switch>
              </box>
            )}
          </For>
          <Show when={props.session.plan}>
            <box style={{ marginLeft: 2 }}>
              <AgentPlan plan={props.session.plan ?? []} />
            </box>
          </Show>
        </box>
      </Show>
    </box>
  );
}
