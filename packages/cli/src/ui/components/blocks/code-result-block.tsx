import { defaultSyntaxStyle } from "#ui/styles/syntax-styles";
import { getFiletypeFromPath } from "#utils/filetype";

export interface CodeResultBlockProps {
  content: string;
  filePath?: string;
  startLine?: number;
}

export function CodeResultBlock(props: CodeResultBlockProps) {
  const filetype = () => getFiletypeFromPath(props.filePath ?? "");
  const startLine = () => props.startLine ?? 1;

  return (
    <box flexDirection="column">
      <line_number
        bg="#161b22"
        fg="#6b7280"
        height="100%"
        minWidth={4}
        paddingRight={1}
        showLineNumbers={true}
        startLine={startLine()}
        width="100%"
      >
        <code
          content={props.content}
          filetype={filetype()}
          height="100%"
          syntaxStyle={defaultSyntaxStyle}
          width="100%"
        />
      </line_number>
    </box>
  );
}
