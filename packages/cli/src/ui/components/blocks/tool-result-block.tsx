import { Show } from "solid-js";
import type { ToolResultBlock as ToolResultBlockType } from "#parsers/message-types";

export interface ToolResultBlockProps {
  block: ToolResultBlockType;
  expanded: boolean;
}

export function ToolResultBlock(props: ToolResultBlockProps) {
  const resultText = () => {
    const content = props.block.content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("");
    }
    return "";
  };

  const summary = () => {
    const text = resultText();
    const firstLine = text.split("\n")[0] || "";
    return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
  };

  return (
    <box flexDirection="column">
      <Show when={resultText()}>
        <text>
          <span style={{ fg: "#666666" }}>└ {summary()}</span>
        </text>
      </Show>

      <Show when={props.expanded && resultText()}>
        <box
          border
          style={{
            paddingLeft: 1,
            marginLeft: 2,
            maxHeight: 10,
            backgroundColor: "#1a1a1a",
          }}
        >
          <text>{resultText()}</text>
        </box>
      </Show>
    </box>
  );
}
