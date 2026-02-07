import { createEffect, createMemo, For, Match, Show, Switch } from "solid-js";
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
import {
  getActivityIndicator,
  getStatusColor,
  getStatusIcon,
  LOOP_STATE_COLORS,
} from "./session-utils";

export interface SessionContainerProps {
  session: SessionState;
  expanded: boolean;
  selected?: boolean;
  canOpen?: boolean;
  loopState?: string;
  onToggle: () => void;
}

export function SessionContainer(props: SessionContainerProps) {
  // Local stores for granular reactivity
  const [items, setItems] = createStore(props.session.items);

  // Sync items when props change
  createEffect(() => {
    setItems(reconcile(props.session.items, { key: "id" }));
  });

  const title = () => getSessionTitle(props.session);
  const sessionId = () => props.session.id.slice(0, 16);

  const statusIcon = () => getStatusIcon(props.session.status);
  const statusColor = () => getStatusColor(props.session.status);
  const activityIndicator = () => getActivityIndicator(props.session.activity);

  const lastThinkingDeltaIndex = createMemo(() => {
    let last = -1;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && isThinkingDeltaItem(it)) {
        last = i;
      }
    }
    return last;
  });

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
            {(item, index) => (
              <box>
                <Switch>
                  <Match when={isMessageItem(item)}>
                    <MessageItem message={item.data as Message} />
                  </Match>
                  <Match when={isResultItem(item)}>
                    <ResultMessage message={item.data as ResultMessageType} />
                  </Match>
                  <Match when={isTextDeltaItem(item)}>
                    <TextDeltaBlock message={item.data as TextDelta} />
                  </Match>
                  <Match when={isThinkingDeltaItem(item)}>
                    <ThinkingBlock
                      active={index() === lastThinkingDeltaIndex()}
                      block={item.data as ThinkingDelta}
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
