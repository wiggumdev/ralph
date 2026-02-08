import { Show } from "solid-js";
import type { TextDelta } from "#parsers/message-types";
import "opentui-spinner/solid";
import { markdownSyntaxStyle } from "#ui/styles/syntax-styles";

export interface TextDeltaBlockProps {
  message: TextDelta;
  active?: boolean;
}

export function TextDeltaBlock(props: TextDeltaBlockProps) {
  return (
    <box style={{ paddingLeft: 2 }}>
      <Show when={props.active}>
        <box alignItems="center" flexDirection="row">
          <spinner color="#00aaff" name="dots" />
        </box>
      </Show>
      <markdown
        conceal
        content={props.message.text}
        streaming={true}
        syntaxStyle={markdownSyntaxStyle}
      />
    </box>
  );
}
