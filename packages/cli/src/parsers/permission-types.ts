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
}

export interface PermissionResponse {
  id: string;
  outcome: "selected" | "cancelled";
  optionId?: string;
}
