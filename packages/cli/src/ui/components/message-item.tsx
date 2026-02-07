import { For, Match, Switch } from "solid-js";
import type {
  AudioBlock as AudioBlockType,
  EmbeddedResourceBlock as EmbeddedResourceBlockType,
  ImageBlock as ImageBlockType,
  Message,
  ResourceLinkBlock as ResourceLinkBlockType,
  TerminalBlock as TerminalBlockType,
  ThinkingBlock as ThinkingBlockType,
} from "#parsers/message-types";
import { AudioBlock } from "./blocks/audio-block";
import { EmbeddedResourceBlock } from "./blocks/embedded-resource-block";
import { ImageBlock } from "./blocks/image-block";
import { ResourceLinkBlock } from "./blocks/resource-link-block";
import { TerminalBlock } from "./blocks/terminal-block";
import { TextBlock } from "./blocks/text-block";
import { ThinkingBlock } from "./blocks/thinking-block";

export interface MessageItemProps {
  message: Message;
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
            <Match when={block.type === "thinking"}>
              <ThinkingBlock block={block as ThinkingBlockType} />
            </Match>
            <Match when={block.type === "image"}>
              <ImageBlock block={block as ImageBlockType} />
            </Match>
            <Match when={block.type === "audio"}>
              <AudioBlock block={block as AudioBlockType} />
            </Match>
            <Match when={block.type === "resource_link"}>
              <ResourceLinkBlock block={block as ResourceLinkBlockType} />
            </Match>
            <Match when={block.type === "resource"}>
              <EmbeddedResourceBlock
                block={block as EmbeddedResourceBlockType}
              />
            </Match>
            <Match when={block.type === "terminal"}>
              <TerminalBlock block={block as TerminalBlockType} />
            </Match>
          </Switch>
        )}
      </For>
    </box>
  );
}
