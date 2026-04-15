import type { SessionState, SessionUsage } from "#parsers/message-types";
import type { PermissionRequest } from "#parsers/permission-types";
import type { PrdFeature } from "#schema/prd";

/** Core state shape matching RalphApp signals */
export interface AppState {
  sessions: SessionState[];
  status: "running" | "complete" | "error" | "idle" | "paused" | "stopped";
  iteration: number;

  // Computed totals (sum of all sessions)
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  toolCallCount: number;

  // Global items
  prdItems: PrdFeature[];

  // Permission request (shown in modal)
  permissionRequest: PermissionRequest | null;
}

/** Command to open a session in the native CLI */
export interface OpenCommand {
  command: string;
  args: string[];
}

/** State provider abstraction for test harness */
export interface StateProvider {
  getInitialState(): AppState;
  subscribe(onUpdate: (state: Partial<AppState>) => void): () => void;
  start(): void;
  stop(): void;
  pause?(): void | Promise<void>;
  resume?(): void;
  /** Get command to open current session in native CLI, null if not supported */
  getOpenCommand?(): OpenCommand | null;
  /** Check if open feature is supported by this adapter */
  canOpen?(): boolean;
}

/** Default empty state */
export const DEFAULT_STATE: AppState = {
  sessions: [],
  status: "idle",
  iteration: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  toolCallCount: 0,
  prdItems: [],
  permissionRequest: null,
};

/** Get the active (most recent) session */
export function getActiveSession(state: AppState): SessionState | undefined {
  return state.sessions.at(-1);
}

/** Compute total usage across all sessions */
export function computeTotals(sessions: SessionState[]): SessionUsage {
  return sessions.reduce(
    (acc, s) => ({
      inputTokens: acc.inputTokens + s.usage.inputTokens,
      outputTokens: acc.outputTokens + s.usage.outputTokens,
      cost: acc.cost + s.usage.cost,
      toolCallCount: acc.toolCallCount + s.usage.toolCallCount,
    }),
    { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 }
  );
}
