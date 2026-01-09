import type { PartialToolInput } from "#parsers/message-types";

export interface PartialToolBlockProps {
  message: PartialToolInput;
}

export function PartialToolBlock(props: PartialToolBlockProps) {
  const preview = () => {
    const json = JSON.stringify(props.message.partialInput, null, 2);
    return json.length > 200 ? `${json.slice(0, 200)}...` : json;
  };

  return (
    <box flexDirection="column" style={{ paddingLeft: 2, marginTop: 1 }}>
      <text>
        <span style={{ fg: "#ffaa00" }}>
          🔧 {props.message.toolName || "Tool"} (streaming...)
        </span>
      </text>
      <box style={{ paddingLeft: 2 }}>
        <text style={{ fg: "#666666" }}>{preview()}</text>
      </box>
    </box>
  );
}
