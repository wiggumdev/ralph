import type { TextDelta } from "#parsers/message-types";
import { markdownSyntaxStyle } from "#ui/styles/syntax-styles";

export interface TextDeltaBlockProps {
  message: TextDelta;
}

export function TextDeltaBlock(props: TextDeltaBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <code
        content={props.message.text}
        drawUnstyledText={false}
        filetype="markdown"
        streaming={true}
        syntaxStyle={markdownSyntaxStyle}
      />
    </box>
  );
}
