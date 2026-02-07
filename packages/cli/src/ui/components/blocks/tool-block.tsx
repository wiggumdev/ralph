import { Show } from "solid-js";
import type { ToolBlock as ToolBlockType } from "#parsers/message-types";
import { CodeResultBlock } from "#ui/components/blocks/code-result-block";
import { defaultSyntaxStyle } from "#ui/styles/syntax-styles";
import { generateUnifiedDiff } from "#utils/diff-formatter";
import { getFiletypeFromPath } from "#utils/filetype";
import { formatToolDisplay } from "#utils/tool-formatter";
import {
  CLAUDE_READ_PATTERN,
  extractReadContent,
  getResultSummary,
  getToolColor,
  getToolIcon,
} from "./tool-block-utils";

export interface ToolBlockProps {
  block: ToolBlockType;
  expanded: boolean;
}

export function ToolBlock(props: ToolBlockProps) {
  const toolName = () =>
    (props.block.resolvedName || props.block.title).toLowerCase();

  // Don't render TodoWrite - handled by session panel sidebar
  if (toolName() === "todowrite" || toolName() === "todo_write") {
    return null;
  }

  const input = () => props.block.rawInput ?? {};
  const displayName = () =>
    formatToolDisplay(props.block.resolvedName || props.block.title, input());
  const icon = () => getToolIcon(props.block.title, props.block.kind);
  const iconColor = () => getToolColor(props.block.title, props.block.kind);

  const statusIndicator = () => {
    switch (props.block.status) {
      case "pending":
        return "\u25cb";
      case "in_progress":
        return "\u25d0";
      case "completed":
        return "\u2713";
      case "failed":
        return "\u2717";
      default:
        return "";
    }
  };

  const statusColor = () => {
    switch (props.block.status) {
      case "pending":
        return "#666666";
      case "in_progress":
        return "#f5a742";
      case "completed":
        return "#7fd88f";
      case "failed":
        return "#ff6666";
      default:
        return "#666666";
    }
  };

  const isEdit = () => toolName() === "edit";

  const filePath = () => (input().file_path as string) || "";

  const unifiedDiff = () => {
    if (!isEdit()) {
      return "";
    }
    const oldStr =
      (input().old_string as string) || (input().oldString as string) || "";
    const newStr =
      (input().new_string as string) || (input().newString as string) || "";
    if (!(oldStr || newStr)) {
      return "";
    }
    return generateUnifiedDiff(oldStr, newStr, filePath());
  };

  const filetype = () => getFiletypeFromPath(filePath());

  const resultSummary = () => getResultSummary(props.block.content);

  const isRead = () => toolName() === "read";

  const readContent = () => {
    if (!(isRead() && props.block.content)) {
      return null;
    }
    for (const item of props.block.content) {
      if (item.type === "content" && item.content.type === "text") {
        const text = item.content.text;
        if (CLAUDE_READ_PATTERN.test(text)) {
          return extractReadContent(text);
        }
      }
    }
    return null;
  };

  const readFilePath = () => (input().file_path as string) || "";

  return (
    <box flexDirection="column">
      <text>
        <span style={{ fg: statusColor() }}>{statusIndicator()} </span>
        <span style={{ fg: iconColor() }}>{icon()} </span>
        <span style={{ fg: "#808080" }}>{displayName()}</span>
      </text>

      <Show when={isEdit() && unifiedDiff()}>
        <box style={{ marginLeft: 2 }}>
          <diff
            addedBg="#1a4d1a"
            addedSignColor="#22c55e"
            diff={unifiedDiff()}
            filetype={filetype()}
            removedBg="#4d1a1a"
            removedSignColor="#ef4444"
            showLineNumbers={true}
            syntaxStyle={defaultSyntaxStyle}
            view="unified"
          />
        </box>
      </Show>

      <Show
        when={
          !(isEdit() || isRead()) &&
          props.block.status === "completed" &&
          resultSummary() &&
          resultSummary().trim().length > 1
        }
      >
        <text>
          <span style={{ fg: "#666666" }}> ⎿ {resultSummary()}</span>
        </text>
      </Show>

      <Show when={isRead() && props.expanded && readContent()}>
        <box style={{ marginLeft: 2 }}>
          <CodeResultBlock
            content={readContent()?.content ?? ""}
            filePath={readFilePath()}
            startLine={readContent()?.startLine}
          />
        </box>
      </Show>

      <Show when={isRead() && !props.expanded && resultSummary()}>
        <text>
          <span style={{ fg: "#666666" }}> ⎿ {resultSummary()}</span>
        </text>
      </Show>
    </box>
  );
}
