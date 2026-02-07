import type { TextDelta } from "#parsers/message-types";
import { markdownSyntaxStyle } from "#ui/styles/syntax-styles";

export interface TextDeltaBlockProps {
  message: TextDelta;
}

export function TextDeltaBlock(props: TextDeltaBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <markdown
        conceal
        content={props.message.text}
        streaming={true}
        syntaxStyle={markdownSyntaxStyle}
      />
    </box>
  );
}
