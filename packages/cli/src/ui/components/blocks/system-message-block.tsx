import type { SystemMessage } from "#parsers/message-types";

export interface SystemMessageBlockProps {
  message: SystemMessage;
}

export function SystemMessageBlock(props: SystemMessageBlockProps) {
  const parts: string[] = [];

  if (props.message.subtype) {
    parts.push(props.message.subtype);
  }

  if (props.message.model) {
    parts.push(props.message.model);
  }

  if (props.message.tools?.length) {
    parts.push(`${props.message.tools.length} tools`);
  }

  const info = parts.length > 0 ? parts.join(" | ") : "initialized";

  return (
    <box style={{ paddingLeft: 2 }}>
      <text style={{ fg: "#666666" }}>[system] {info}</text>
    </box>
  );
}
