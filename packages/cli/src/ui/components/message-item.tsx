import { For, Match, Switch } from "solid-js";
import type { Message } from "#parsers/message-types";
import { TextBlock } from "./blocks/text-block";
import { ToolResultBlock } from "./blocks/tool-result-block";
import { ToolUseBlock } from "./blocks/tool-use-block";

export interface MessageItemProps {
  message: Message;
  expanded: boolean;
}

export function MessageItem(props: MessageItemProps) {
  return (
    <box flexDirection="column">
      <For each={props.message.content}>
        {(block) => (
          <Switch>
            <Match when={block.type === "text"}>
              <TextBlock
                block={block as import("#parsers/message-types").TextBlock}
              />
            </Match>
            <Match when={block.type === "tool_use"}>
              <ToolUseBlock
                block={block as import("#parsers/message-types").ToolUseBlock}
                expanded={props.expanded}
              />
            </Match>
            <Match when={block.type === "tool_result"}>
              <ToolResultBlock
                block={
                  block as import("#parsers/message-types").ToolResultBlock
                }
                expanded={props.expanded}
              />
            </Match>
          </Switch>
        )}
      </For>
    </box>
  );
}
