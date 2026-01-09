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

  const statusColor = () => (props.block.is_error ? "#ff0000" : "#00ff00");
  const statusIcon = () => (props.block.is_error ? "✗" : "✓");

  const preview = () => {
    const text = resultText();
    return text.length > 100 ? `${text.slice(0, 100)}...` : text;
  };

  return (
    <box flexDirection="column" style={{ paddingLeft: 2, marginTop: 1 }}>
      <text>
        <span style={{ fg: statusColor() }}>{statusIcon()} Result</span>
        <span style={{ fg: "#666666" }}>
          {" "}
          (for: {props.block.tool_use_id.slice(0, 8)})
        </span>
      </text>

      <Show when={props.expanded && resultText()}>
        <box
          border
          style={{
            paddingLeft: 1,
            marginTop: 1,
            marginLeft: 2,
            maxHeight: 10,
            backgroundColor: "#1a1a1a",
          }}
        >
          <text>{resultText()}</text>
        </box>
      </Show>

      <Show when={!props.expanded && resultText()}>
        <box style={{ paddingLeft: 2 }}>
          <text style={{ fg: "#666666" }}>{preview()}</text>
        </box>
      </Show>
    </box>
  );
}
