import { For, Match, Show, Switch } from "solid-js";
import type {
  Message,
  ResultMessage as ResultMessageType,
  SessionState,
  SystemMessage,
  TextDelta,
  ToolReference,
} from "#parsers/message-types";
import {
  isMessage,
  isResultMessage,
  isSystemMessage,
  isTextDelta,
  isToolReference,
} from "#parsers/message-types";
import { getSessionTitle } from "#utils/session-title";
import { AgentPlan } from "./agent-plan";
import { SystemMessageBlock } from "./blocks/system-message-block";
import { TextDeltaBlock } from "./blocks/text-delta-block";
import { ToolBlock } from "./blocks/tool-block";
import { MessageItem } from "./message-item";
import { ResultMessage } from "./result-message";

export interface SessionContainerProps {
  session: SessionState;
  expanded: boolean;
  selected?: boolean;
  canOpen?: boolean;
  onToggle: () => void;
}

export function SessionContainer(props: SessionContainerProps) {
  const title = () => getSessionTitle(props.session);
  const sessionId = () => props.session.id.slice(0, 16);

  const statusIcon = () => {
    switch (props.session.status) {
      case "running":
        return "↻";
      case "complete":
        return "✓";
      case "error":
        return "✗";
      case "paused":
        return "⏸";
      default:
        return "?";
    }
  };

  const statusColor = () => {
    switch (props.session.status) {
      case "running":
        return "#00aaff";
      case "complete":
        return "#00ff00";
      case "error":
        return "#ff0000";
      case "paused":
        return "#ffff00";
      default:
        return "#808080";
    }
  };

  const rowColor = () => (props.selected ? "#ffffff" : "#00aaff");

  return (
    <box flexDirection="column" style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: statusColor() }}>{statusIcon()}</span>
        <span style={{ fg: rowColor() }}> Loop {props.session.iteration}</span>
        <Show when={title()}>
          <span style={{ fg: "#ffffff" }}>: {title()}</span>
        </Show>
        <span style={{ fg: "#606060" }}> {sessionId()}</span>
        <Show when={props.selected}>
          <span style={{ fg: "#666666" }}>
            {" "}
            [l] expand [h] collapse{props.canOpen && " [o] open"}{" "}
            {props.session.status === "running" && "[p] pause"}
            {props.session.status === "paused" && "[p] resume"}
          </span>
        </Show>
      </text>

      <Show when={!props.session.collapsed}>
        <box style={{ marginTop: 0 }}>
          <text>
            <span style={{ fg: "#444444" }}>{"─".repeat(60)}</span>
          </text>
        </box>
        <box flexDirection="column" style={{ marginLeft: 2 }}>
          {/* Render messages with interleaved tool calls */}
          <For each={props.session.messages}>
            {(msg) => (
              <box>
                <Switch>
                  <Match when={isMessage(msg)}>
                    <MessageItem
                      expanded={props.expanded}
                      message={msg as Message}
                    />
                  </Match>
                  <Match when={isResultMessage(msg)}>
                    <ResultMessage message={msg as ResultMessageType} />
                  </Match>
                  <Match when={isTextDelta(msg)}>
                    <TextDeltaBlock message={msg as TextDelta} />
                  </Match>
                  <Match when={isSystemMessage(msg)}>
                    <SystemMessageBlock message={msg as SystemMessage} />
                  </Match>
                  <Match when={isToolReference(msg)}>
                    {(() => {
                      const ref = msg as ToolReference;
                      const tool = props.session.toolCalls.get(ref.toolCallId);
                      return tool ? (
                        <ToolBlock block={tool} expanded={props.expanded} />
                      ) : null;
                    })()}
                  </Match>
                </Switch>
              </box>
            )}
          </For>
        </box>
        <Show when={props.session.plan}>
          <box style={{ marginLeft: 2 }}>
            <AgentPlan plan={props.session.plan ?? []} />
          </box>
        </Show>
      </Show>
    </box>
  );
}
