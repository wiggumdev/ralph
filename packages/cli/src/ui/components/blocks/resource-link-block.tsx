import { Show } from "solid-js";
import type { ResourceLinkBlock as ResourceLinkBlockType } from "#parsers/message-types";

export interface ResourceLinkBlockProps {
  block: ResourceLinkBlockType;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ResourceLinkBlock(props: ResourceLinkBlockProps) {
  const displayName = () => props.block.title || props.block.name;
  const sizeStr = () =>
    props.block.size ? ` (${formatBytes(props.block.size)})` : "";

  return (
    <box flexDirection="column" style={{ paddingLeft: 2 }}>
      <text>
        <span style={{ fg: "#5c9cf5" }}>-&gt; </span>
        <span style={{ fg: "#808080" }}>{displayName()}</span>
        <span style={{ fg: "#606060" }}>{sizeStr()}</span>
      </text>
      <Show when={props.block.description}>
        <text>
          <span style={{ fg: "#666666" }}> {props.block.description}</span>
        </text>
      </Show>
    </box>
  );
}
