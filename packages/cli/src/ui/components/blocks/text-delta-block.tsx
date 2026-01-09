import type { TextDelta } from "#parsers/message-types";

export interface TextDeltaBlockProps {
  message: TextDelta;
}

export function TextDeltaBlock(props: TextDeltaBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <text style={{ fg: "#cccccc" }}>{props.message.text}</text>
    </box>
  );
}
