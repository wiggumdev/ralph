import { Show } from "solid-js";
import type { ToolUseBlock as ToolUseBlockType } from "#parsers/message-types";

export interface ToolUseBlockProps {
  block: ToolUseBlockType;
  expanded: boolean;
}

export function ToolUseBlock(props: ToolUseBlockProps) {
  const inputJson = () => JSON.stringify(props.block.input, null, 2);

  const inputPreview = () => {
    const json = inputJson();
    return json.length > 100 ? `${json.slice(0, 100)}...` : json;
  };

  return (
    <box flexDirection="column" style={{ paddingLeft: 2, marginTop: 1 }}>
      <text>
        <span style={{ fg: "#ffaa00" }}>🔧 {props.block.name}</span>
        <span style={{ fg: "#666666" }}>
          {" "}
          (id: {props.block.id.slice(0, 8)})
        </span>
      </text>

      <Show when={props.expanded}>
        <box style={{ paddingLeft: 2, marginTop: 1 }}>
          <text style={{ fg: "#888888" }}>Input:</text>
        </box>
        <box
          border
          style={{
            paddingLeft: 1,
            marginTop: 1,
            marginLeft: 2,
            backgroundColor: "#1a1a1a",
          }}
        >
          <text>{inputJson()}</text>
        </box>
      </Show>

      <Show when={!props.expanded}>
        <box style={{ paddingLeft: 2 }}>
          <text style={{ fg: "#666666" }}>{inputPreview()}</text>
        </box>
      </Show>
    </box>
  );
}
