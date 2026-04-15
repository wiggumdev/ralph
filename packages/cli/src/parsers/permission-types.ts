import type {
  PermissionOption,
  ToolCallUpdate,
} from "@agentclientprotocol/sdk";

export interface PermissionRequest {
  id: string;
  sessionId: string;
  toolCall: ToolCallUpdate;
  options: PermissionOption[];
  timestamp: number;
  /** Resolved tool name from earlier tool_call update (for permission formatting) */
  resolvedToolName?: string;
}

export interface PermissionResponse {
  id: string;
  outcome: "selected" | "cancelled";
  optionId?: string;
}
