import { For, Match, Switch } from "solid-js";
import type { RichMessage } from "#parsers/message-types";
import {
  isMessage,
  isResultMessage,
  isSystemMessage,
  isTextDelta,
} from "#parsers/message-types";
import { SystemMessageBlock } from "./blocks/system-message-block";
import { TextDeltaBlock } from "./blocks/text-delta-block";
import { MessageItem } from "./message-item";
import { ResultMessage } from "./result-message";

export interface MessageListProps {
  messages: RichMessage[];
  expanded: boolean;
}

export function MessageList(props: MessageListProps) {
  return (
    <box style={{ marginTop: 1, flexGrow: 1 }}>
      <For each={props.messages}>
        {(msg) => (
          <box>
            <Switch>
              <Match when={isMessage(msg)}>
                <MessageItem
                  expanded={props.expanded}
                  message={msg as import("#parsers/message-types").Message}
                />
              </Match>
              <Match when={isResultMessage(msg)}>
                <ResultMessage
                  message={
                    msg as import("#parsers/message-types").ResultMessage
                  }
                />
              </Match>
              <Match when={isTextDelta(msg)}>
                <TextDeltaBlock
                  message={msg as import("#parsers/message-types").TextDelta}
                />
              </Match>
              <Match when={isSystemMessage(msg)}>
                <SystemMessageBlock
                  message={
                    msg as import("#parsers/message-types").SystemMessage
                  }
                />
              </Match>
            </Switch>
          </box>
        )}
      </For>
    </box>
  );
}
