import type { TextBlock as TextBlockType } from "#parsers/message-types";
import { markdownSyntaxStyle } from "#ui/styles/syntax-styles";

export interface TextBlockProps {
  block: TextBlockType;
}

export function TextBlock(props: TextBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <code
        content={props.block.text}
        drawUnstyledText={false}
        filetype="markdown"
        selectable
        selectionBg="#264F78"
        selectionFg="#FFFFFF"
        syntaxStyle={markdownSyntaxStyle}
      />
    </box>
  );
}
