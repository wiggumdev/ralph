import { Show } from "solid-js";
import type {
  ThinkingBlock as ThinkingBlockType,
  ThinkingDelta,
} from "#parsers/message-types";

export interface ThinkingBlockProps {
  block: ThinkingBlockType | ThinkingDelta;
  expanded?: boolean;
}

const PURPLE = "#9d7cd8";
const COLLAPSED_PREVIEW_LENGTH = 60;

export function ThinkingBlock(props: ThinkingBlockProps) {
  const text = () => props.block.text;
  const isExpanded = () => props.expanded ?? false;
  const preview = () => {
    const t = text();
    if (t.length <= COLLAPSED_PREVIEW_LENGTH) {
      return t;
    }
    return `${t.slice(0, COLLAPSED_PREVIEW_LENGTH)}...`;
  };

  return (
    <box flexDirection="column" style={{ marginBottom: 1 }}>
      <text>
        <span style={{ fg: PURPLE }}>
          {isExpanded() ? "\u25bc" : "\u25b6"} Thinking
        </span>
        <Show when={!isExpanded()}>
          <span style={{ fg: "#666666" }}> {preview()}</span>
        </Show>
      </text>
      <Show when={isExpanded()}>
        <box style={{ paddingLeft: 2, marginTop: 0 }}>
          <text style={{ fg: "#888888" }}>{text()}</text>
        </box>
      </Show>
    </box>
  );
}
