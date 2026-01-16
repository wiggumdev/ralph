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

export interface TrackedPermission {
  formattedName: string; // "Bash(bunx foo)", "WebFetch(domain:x.com)"
  status: "allowed" | "denied";
}

export interface PermissionSummary {
  formattedName: string;
  status: "allowed" | "denied";
  count: number;
}
