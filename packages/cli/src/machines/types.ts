import type { ActorRefFrom } from "xstate";
import type { AcpAdapter, AcpAdapterOptions } from "#adapters/acp";
import type { RichMessage, SessionState } from "#parsers/message-types";
import type {
  PermissionRequest,
  PermissionResponse,
} from "#parsers/permission-types";
import type { PrdFeature } from "#schema/prd";
import type { sessionMachine } from "./session-machine";

// --- Session Machine Types ---

export interface LoopContext {
  sessions: SessionState[];
  currentSession: SessionState | null;
  iteration: number;
  maxIterations?: number;
  promiseComplete: boolean;

  // Buffers
  textBuffer: string;
  thinkingBuffer: string;
  accumulatedTextItemId: string | null;
  accumulatedThinkingItemId: string | null;

  // Permissions
  pendingPermissions: Map<string, DeferredPermission>;
  currentPermissionId: string | null;
  // Counters
  messageCount: number;

  // Agents
  activeAgentStack: string[];
  itemIdCounter: number;

  // Adapter + options
  adapter: AcpAdapter;
  options: LoopOptions;

  // Totals
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  toolCallCount: number;
  prdItems: PrdFeature[];
  error?: Error;
}

export interface DeferredPermission {
  request: PermissionRequest;
  resolve: (response: PermissionResponse) => void;
}

export interface LoopOptions extends AcpAdapterOptions {
  prompt: string;
  maxIterations?: number;
  yolo?: boolean;
  transportLog?: boolean;
}

export type LoopEvent =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "MESSAGE"; message: RichMessage }
  | { type: "COMPLETE"; result: { stopReason: string } }
  | { type: "ERROR"; error: Error }
  | {
      type: "PERMISSION_REQUEST";
      request: PermissionRequest;
      resolve: (response: PermissionResponse) => void;
    }
  | { type: "PERMISSION_RESPONSE"; response: PermissionResponse }
  | { type: "NEXT_ITERATION" };

export interface LoopInput {
  adapter: AcpAdapter;
  options: LoopOptions;
}

// --- TUI Machine Types ---

export type TabView = "loop" | "learning" | "backlog";

export interface TUIContext {
  loopRef: ActorRefFrom<typeof sessionMachine> | null;
  currentTab: TabView;
  helpVisible: boolean;
  selectedIndex: number;
  expanded: boolean;
  autoExit: boolean;
  canOpen: boolean;
}

// --- Source Actor Types ---

export interface AdapterSourceInput {
  adapter: AcpAdapter;
  prompt: string;
  options: AcpAdapterOptions;
}

export interface PlaybackSourceInput {
  iterations: RichMessage[][];
  speed: number;
  baseDelay: number;
}
