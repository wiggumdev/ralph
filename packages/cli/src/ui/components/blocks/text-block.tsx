import type { TextBlock as TextBlockType } from "#parsers/message-types";

export interface TextBlockProps {
  block: TextBlockType;
}

export function TextBlock(props: TextBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <text>{props.block.text}</text>
    </box>
  );
}
