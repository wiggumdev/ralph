import type { TextBlock as TextBlockType } from "#parsers/message-types";

export interface TextBlockProps {
  block: TextBlockType;
}

export function TextBlock(props: TextBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <text selectable selectionBg="#264F78" selectionFg="#FFFFFF">
        {props.block.text}
      </text>
    </box>
  );
}
