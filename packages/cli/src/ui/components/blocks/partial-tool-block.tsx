import type { PartialToolInput } from "#parsers/message-types";

export interface PartialToolBlockProps {
  message: PartialToolInput;
}

function getPendingDescription(
  name: string | undefined,
  input: Record<string, unknown>
): string {
  const toolName = name?.toLowerCase() || "";
  switch (toolName) {
    case "read":
      return `Reading ${input.file_path || "file"}...`;
    case "write":
      return `Writing ${input.file_path || "file"}...`;
    case "edit":
      return `Editing ${input.file_path || "file"}...`;
    case "bash":
      return "Running command...";
    case "glob":
      return `Searching for "${input.pattern || "pattern"}"...`;
    case "grep":
      return `Searching for "${input.pattern || "pattern"}"...`;
    case "task":
      return `${input.description || "Running task"}...`;
    default:
      return `Running ${name || "tool"}...`;
  }
}

export function PartialToolBlock(props: PartialToolBlockProps) {
  const description = () =>
    getPendingDescription(props.message.toolName, props.message.partialInput);

  return (
    <box flexDirection="column">
      <text>
        <span style={{ fg: "#808080" }}>~ {description()}</span>
      </text>
    </box>
  );
}
