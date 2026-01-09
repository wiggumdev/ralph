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
  const roleColor = () => {
    switch (props.message.role) {
      case "user":
        return "#00aaff";
      case "assistant":
        return "#00ff00";
      default:
        return "#888888";
    }
  };

  const roleIcon = () => {
    switch (props.message.role) {
      case "user":
        return "👤";
      case "assistant":
        return "🤖";
      default:
        return "📝";
    }
  };

  return (
    <box flexDirection="column" style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: roleColor() }}>
          {roleIcon()} {props.message.role.toUpperCase()}
        </span>
      </text>
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
