import { For, Match, Switch } from "solid-js";
import type { RichMessage } from "#parsers/message-types";
import {
  isMessage,
  isPartialToolInput,
  isResultMessage,
  isSystemMessage,
  isTextDelta,
} from "#parsers/message-types";
import { PartialToolBlock } from "./blocks/partial-tool-block";
import { TextDeltaBlock } from "./blocks/text-delta-block";
import { MessageItem } from "./message-item";
import { ResultMessage } from "./result-message";
import { SystemMessage } from "./system-message";

export interface MessageListProps {
  messages: RichMessage[];
  expanded: boolean;
}

export function MessageList(props: MessageListProps) {
  return (
    <scrollbox
      border
      stickyScroll
      stickyStart="bottom"
      style={{ marginTop: 1, flexGrow: 1 }}
    >
      <For each={props.messages}>
        {(msg) => (
          <Switch>
            <Match when={isSystemMessage(msg)}>
              <SystemMessage
                message={msg as import("#parsers/message-types").SystemMessage}
              />
            </Match>
            <Match when={isMessage(msg)}>
              <MessageItem
                expanded={props.expanded}
                message={msg as import("#parsers/message-types").Message}
              />
            </Match>
            <Match when={isResultMessage(msg)}>
              <ResultMessage
                message={msg as import("#parsers/message-types").ResultMessage}
              />
            </Match>
            <Match when={isPartialToolInput(msg)}>
              <PartialToolBlock
                message={
                  msg as import("#parsers/message-types").PartialToolInput
                }
              />
            </Match>
            <Match when={isTextDelta(msg)}>
              <TextDeltaBlock
                message={msg as import("#parsers/message-types").TextDelta}
              />
            </Match>
          </Switch>
        )}
      </For>
    </scrollbox>
  );
}
