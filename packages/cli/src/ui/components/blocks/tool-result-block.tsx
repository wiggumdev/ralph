import { Show } from "solid-js";
import type { ToolResultBlock as ToolResultBlockType } from "#parsers/message-types";

// Claude format: "    1→content"
const CLAUDE_READ_PATTERN = /^\s*\d+→/;
// OpenCode format: "<file>..." with "(End of file - total X lines)" or "(File has more lines..."
const OPENCODE_FILE_PATTERN = /^<file>/;
const OPENCODE_LINES_PATTERN = /total (\d+) lines|beyond line (\d+)/;

export interface ToolResultBlockProps {
  block: ToolResultBlockType;
}

export function ToolResultBlock(props: ToolResultBlockProps) {
  const resultText = () => {
    const content = props.block.content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("");
    }
    return "";
  };

  // Detect Read tool results - Claude format with line numbers
  const isClaudeReadResult = () => {
    const text = resultText();
    return CLAUDE_READ_PATTERN.test(text);
  };

  // Detect Read tool results - OpenCode format with <file> wrapper
  const isOpenCodeReadResult = () => {
    const text = resultText();
    return OPENCODE_FILE_PATTERN.test(text);
  };

  const claudeLineCount = () => {
    const text = resultText();
    const lines = text
      .split("\n")
      .filter((line) => CLAUDE_READ_PATTERN.test(line));
    return lines.length;
  };

  const openCodeLineCount = () => {
    const text = resultText();
    const match = OPENCODE_LINES_PATTERN.exec(text);
    if (match) {
      return Number.parseInt(match[1] || match[2] || "0", 10);
    }
    // Fallback: count lines between <file> and </file>
    const lines = text
      .split("\n")
      .filter((l) => l.trim() && l !== "<file>" && l !== "</file>");
    return lines.length;
  };

  const summary = () => {
    if (isClaudeReadResult()) {
      const count = claudeLineCount();
      return `Read ${count} line${count !== 1 ? "s" : ""}`;
    }
    if (isOpenCodeReadResult()) {
      const count = openCodeLineCount();
      return `Read ${count} line${count !== 1 ? "s" : ""}`;
    }
    const text = resultText();
    const firstLine = text.split("\n")[0] || "";
    return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
  };

  return (
    <box flexDirection="column">
      <Show when={resultText()}>
        <text>
          <span style={{ fg: "#666666" }}> ⎿ {summary()}</span>
        </text>
      </Show>
    </box>
  );
}
