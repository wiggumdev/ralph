// Claude SDK-aligned message schema for stream-json output
export type MessageRole = "user" | "assistant" | "system";

export interface BaseContentBlock {
  type: string;
}

export interface TextBlock extends BaseContentBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock extends BaseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock extends BaseContentBlock {
  type: "tool_result";
  tool_use_id: string;
  content?: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface Message {
  type: "message";
  role: MessageRole;
  content: ContentBlock[];
  timestamp?: number;
}

export interface SystemMessage {
  type: "system";
  subtype?: string;
  session_id?: string;
  model?: string;
  tools?: string[];
  cwd?: string;
  timestamp: number;
}

export interface ResultMessage {
  type: "result";
  subtype: "success" | "error_max_turns" | "error_during_execution";
  result?: string;
  complete: boolean;
  duration_ms?: number;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  timestamp: number;
}

export interface PartialToolInput {
  type: "partial_tool_input";
  index: number;
  toolName?: string;
  partialInput: Record<string, unknown>;
  timestamp: number;
}

export interface TextDelta {
  type: "text_delta";
  text: string;
  timestamp: number;
}

export type RichMessage =
  | Message
  | SystemMessage
  | ResultMessage
  | PartialToolInput
  | TextDelta;

// Type guards
export function isMessage(msg: RichMessage): msg is Message {
  return msg.type === "message";
}

export function isSystemMessage(msg: RichMessage): msg is SystemMessage {
  return msg.type === "system";
}

export function isResultMessage(msg: RichMessage): msg is ResultMessage {
  return msg.type === "result";
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === "text";
}

export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use";
}

export function isToolResultBlock(
  block: ContentBlock
): block is ToolResultBlock {
  return block.type === "tool_result";
}

export function isPartialToolInput(msg: RichMessage): msg is PartialToolInput {
  return msg.type === "partial_tool_input";
}

export function isTextDelta(msg: RichMessage): msg is TextDelta {
  return msg.type === "text_delta";
}
