// Claude SDK-aligned message schema for stream-json output
import type {
  ToolCallLocation,
  ToolCallStatus,
  ToolKind,
} from "@agentclientprotocol/sdk";

export type MessageRole = "user" | "assistant" | "system";

export interface BaseContentBlock {
  type: string;
}

export interface TextBlock extends BaseContentBlock {
  type: "text";
  text: string;
}

// Content types for ToolBlock
export type ToolCallContent =
  | { type: "content"; content: ContentBlock }
  | { type: "diff"; path: string; oldText?: string; newText: string }
  | { type: "terminal"; terminalId: string };

// Unified ToolBlock aligned with ACP schema
export interface ToolBlock {
  type: "tool";
  toolCallId: string;
  title: string;
  kind?: ToolKind;
  status: ToolCallStatus;
  locations?: ToolCallLocation[];
  rawInput?: Record<string, unknown>;
  rawOutput?: unknown;
  content?: ToolCallContent[];
}

export interface ToolUseBlock extends BaseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  kind?: ToolKind;
  status?: ToolCallStatus;
  locations?: ToolCallLocation[];
}

export interface ToolResultBlock extends BaseContentBlock {
  type: "tool_result";
  tool_use_id: string;
  content?: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

export interface ImageBlock extends BaseContentBlock {
  type: "image";
  data: string;
  mimeType: string;
  uri?: string;
}

export interface AudioBlock extends BaseContentBlock {
  type: "audio";
  data: string;
  mimeType: string;
}

export interface ResourceLinkBlock extends BaseContentBlock {
  type: "resource_link";
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
  size?: number;
  title?: string;
}

export interface TextResourceContent {
  type: "text";
  uri: string;
  text: string;
  mimeType?: string;
}

export interface BlobResourceContent {
  type: "blob";
  uri: string;
  blob: string;
  mimeType?: string;
}

export interface EmbeddedResourceBlock extends BaseContentBlock {
  type: "resource";
  resource: TextResourceContent | BlobResourceContent;
}

export type TerminalStatus = "running" | "completed" | "failed";

export interface TerminalBlock extends BaseContentBlock {
  type: "terminal";
  terminalId: string;
  output: string;
  truncated: boolean;
  status: TerminalStatus;
  exitCode?: number | null;
  signal?: string | null;
}

export interface DiffBlock extends BaseContentBlock {
  type: "diff";
  path: string;
  oldText?: string;
  newText: string;
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock
  | AudioBlock
  | ResourceLinkBlock
  | EmbeddedResourceBlock
  | TerminalBlock
  | DiffBlock;

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

export interface TextDelta {
  type: "text_delta";
  text: string;
  timestamp: number;
}

export type PlanEntryPriority = "high" | "medium" | "low";
export type PlanEntryStatus = "pending" | "in_progress" | "completed";

export interface PlanEntry {
  content: string;
  priority: PlanEntryPriority;
  status: PlanEntryStatus;
}

export interface PlanMessage {
  type: "plan";
  entries: PlanEntry[];
  timestamp: number;
}

export interface ToolReference {
  type: "tool_reference";
  toolCallId: string;
  timestamp: number;
}

export type RichMessage =
  | Message
  | SystemMessage
  | ResultMessage
  | TextDelta
  | PlanMessage
  | ToolReference;

export type SessionStatus = "running" | "complete" | "error" | "paused";

// Session state types
export interface AgentInfo {
  name: string;
  version: string;
}

export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  toolCallCount: number;
}

export interface McpServerInfo {
  type: "http" | "sse" | "stdio";
  name?: string;
}

export interface AvailableCommand {
  name: string;
  description: string;
}

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export interface SessionState {
  // Identity
  id: string;
  iteration: number;
  cwd: string;

  // Agent info (from InitializeResponse)
  agentInfo?: AgentInfo;
  agentCapabilities?: Record<string, unknown>;

  // Session config
  mcpServers: McpServerInfo[];
  currentMode?: string;
  availableCommands: AvailableCommand[];

  // Messages for this session
  messages: RichMessage[];

  // Tool calls tracked by toolCallId
  toolCalls: Map<string, ToolBlock>;

  // Usage tracking per session
  usage: SessionUsage;

  // Session-specific todos/plan
  todos: TodoItem[];
  plan?: PlanEntry[];

  // Lifecycle
  startTime: number;
  endTime?: number;
  collapsed: boolean;
  status: SessionStatus;
}

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

export function isToolBlock(block: ToolBlock | unknown): block is ToolBlock {
  return (
    typeof block === "object" &&
    block !== null &&
    (block as ToolBlock).type === "tool"
  );
}

export function isTextDelta(msg: RichMessage): msg is TextDelta {
  return msg.type === "text_delta";
}

export function isPlanMessage(msg: RichMessage): msg is PlanMessage {
  return msg.type === "plan";
}

export function isToolReference(msg: RichMessage): msg is ToolReference {
  return msg.type === "tool_reference";
}

export function isImageBlock(block: ContentBlock): block is ImageBlock {
  return block.type === "image";
}

export function isAudioBlock(block: ContentBlock): block is AudioBlock {
  return block.type === "audio";
}

export function isResourceLinkBlock(
  block: ContentBlock
): block is ResourceLinkBlock {
  return block.type === "resource_link";
}

export function isEmbeddedResourceBlock(
  block: ContentBlock
): block is EmbeddedResourceBlock {
  return block.type === "resource";
}

export function isTerminalBlock(block: ContentBlock): block is TerminalBlock {
  return block.type === "terminal";
}

export function isDiffBlock(block: ContentBlock): block is DiffBlock {
  return block.type === "diff";
}
