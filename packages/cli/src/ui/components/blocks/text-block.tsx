import type { TextBlock as TextBlockType } from "#parsers/message-types";
import { markdownSyntaxStyle } from "#ui/styles/syntax-styles";

export interface TextBlockProps {
  block: TextBlockType;
}

export function TextBlock(props: TextBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <markdown
        conceal
        content={props.block.text}
        syntaxStyle={markdownSyntaxStyle}
      />
    </box>
  );
}
