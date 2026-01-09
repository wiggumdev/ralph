import { For, Match, Switch } from "solid-js";
import type { RichMessage } from "#parsers/message-types";
import {
  isMessage,
  isResultMessage,
  isSystemMessage,
} from "#parsers/message-types";
import { MessageItem } from "./message-item";
import { ResultMessage } from "./result-message";
import { SystemMessage } from "./system-message";

export interface MessageListProps {
  messages: RichMessage[];
  expanded: boolean;
}

export function MessageList(props: MessageListProps) {
  return (
    <scrollbox border style={{ marginTop: 1, height: 20, flexGrow: 1 }}>
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
          </Switch>
        )}
      </For>
    </scrollbox>
  );
}
