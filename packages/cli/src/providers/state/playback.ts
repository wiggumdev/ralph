import type { RichMessage, SessionState } from "#parsers/message-types";
import {
  isMessage,
  isResultMessage,
  isToolUseBlock,
} from "#parsers/message-types";
import type {
  PermissionRequest,
  PermissionResponse,
} from "#parsers/permission-types";
import type { AppState, StateProvider } from "#providers/state";

export interface PlaybackConfig {
  /** Message sequences per iteration (array of arrays) */
  iterations: RichMessage[][];
  /** Playback speed multiplier (1.0 = realtime, 2.0 = 2x speed) */
  speed: number;
  /** Base delay between messages in ms */
  baseDelay: number;
  /** Permission requests to simulate */
  permissionRequests?: PermissionRequest[];
  /** Map message index → permission request index (triggers before that message) */
  schedulePermissionAt?: Record<number, number>;
}

/** Simulates streaming messages over time */
export class PlaybackEngine implements StateProvider {
  private currentIndex = 0;
  private currentIteration = 0;
  private intervalId: Timer | null = null;
  private updateCallback: ((state: Partial<AppState>) => void) | null = null;
  private paused = false;
  private readonly config: PlaybackConfig;
  private readonly maxIterations: number;

  // Session management
  private currentSession: SessionState | null = null;
  private sessions: SessionState[] = [];

  // Permission handling
  private pendingPermissionResolve: (() => void) | null = null;
  private readonly shownPermissions = new Set<number>();

  constructor(config: PlaybackConfig) {
    this.config = config;
    this.maxIterations = config.iterations.length;
  }

  getInitialState(): AppState {
    return {
      sessions: [],
      status: "running",
      iteration: 1,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      toolCallCount: 0,
      prdItems: [],
      permissionRequest: null,
    };
  }

  subscribe(onUpdate: (state: Partial<AppState>) => void): () => void {
    this.updateCallback = onUpdate;
    return () => {
      this.updateCallback = null;
    };
  }

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.createSession(1);

    const delay = this.config.baseDelay / this.config.speed;
    this.intervalId = setInterval(() => this.tick(), delay);
  }

  private createSession(iteration: number): void {
    this.currentSession = {
      id: `playback-${Date.now()}-${iteration}`,
      iteration,
      cwd: process.cwd(),
      agentInfo: { name: "playback", version: "1.0.0" },
      mcpServers: [],
      availableCommands: [],
      messages: [],
      usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
      todos: [],
      startTime: Date.now(),
      collapsed: true,
      status: "running",
    };
    this.sessions = [...this.sessions, this.currentSession];
    this.updateCallback?.({ sessions: this.sessions });
  }

  private tick(): void {
    if (this.paused || this.pendingPermissionResolve) {
      return;
    }

    const messages = this.config.iterations[this.currentIteration];
    if (!messages || this.currentIndex >= messages.length) {
      this.handlePlaybackComplete();
      return;
    }

    // Check for scheduled permission request before this message
    const schedule = this.config.schedulePermissionAt;
    const permissionRequests = this.config.permissionRequests;
    if (schedule && permissionRequests) {
      const permIdx = schedule[this.currentIndex];
      if (
        permIdx !== undefined &&
        permissionRequests[permIdx] &&
        !this.shownPermissions.has(this.currentIndex)
      ) {
        this.shownPermissions.add(this.currentIndex);
        const request = permissionRequests[permIdx];
        this.updateCallback?.({ permissionRequest: request });
        // Pause playback until resolved
        this.pendingPermissionResolve = () => {};
        return;
      }
    }

    const message = messages[this.currentIndex];
    if (message) {
      this.processMessage(message);
    }
    this.currentIndex++;
  }

  private handlePlaybackComplete(): void {
    // Complete current session and collapse it
    if (this.currentSession) {
      const frozenSession: SessionState = Object.freeze({
        ...this.currentSession,
        status: "complete" as const,
        endTime: Date.now(),
        collapsed: true,
      });
      this.sessions = [...this.sessions.slice(0, -1), frozenSession];
    }

    // Start next iteration or finish
    this.currentIteration++;
    if (this.currentIteration < this.maxIterations) {
      this.currentIndex = 0;
      this.createSession(this.currentIteration + 1);
      this.updateCallback?.({
        sessions: this.sessions,
        iteration: this.currentIteration + 1,
      });
    } else {
      this.stop();
      this.updateCallback?.({ status: "complete", sessions: this.sessions });
    }
  }

  private processMessage(message: RichMessage): void {
    if (!this.currentSession) {
      return;
    }

    // Update session messages
    this.currentSession = {
      ...this.currentSession,
      messages: [...this.currentSession.messages, message],
    };

    // Update usage stats
    this.updateSessionUsage(message);

    this.sessions = [...this.sessions.slice(0, -1), this.currentSession];

    // Compute totals from session
    const usage = this.currentSession.usage;
    const update: Partial<AppState> = {
      sessions: this.sessions,
      totalInputTokens: usage.inputTokens,
      totalOutputTokens: usage.outputTokens,
      totalCost: usage.cost,
      toolCallCount: usage.toolCallCount,
    };

    this.updateCallback?.(update);
  }

  private updateSessionUsage(message: RichMessage): void {
    if (!this.currentSession) {
      return;
    }

    const usage = { ...this.currentSession.usage };

    // Count tool calls
    if (isMessage(message)) {
      const toolCalls = message.content.filter(isToolUseBlock);
      if (toolCalls.length > 0) {
        usage.toolCallCount += toolCalls.length;
      }
    }

    // Extract usage from result messages
    if (isResultMessage(message)) {
      if (message.usage) {
        usage.inputTokens = message.usage.input_tokens;
        usage.outputTokens = message.usage.output_tokens;
      }
      if (message.total_cost_usd !== undefined) {
        usage.cost = message.total_cost_usd;
      }
    }

    this.currentSession = {
      ...this.currentSession,
      usage,
    };
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause(): void {
    this.paused = true;
    if (this.currentSession) {
      this.currentSession = { ...this.currentSession, status: "paused" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.updateCallback?.({ status: "paused", sessions: this.sessions });
    }
  }

  resume(): void {
    this.paused = false;
    if (this.currentSession) {
      this.currentSession = { ...this.currentSession, status: "running" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.updateCallback?.({ status: "running", sessions: this.sessions });
    }
  }

  setSpeed(speed: number): void {
    this.config.speed = speed;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  resolvePermission(_response: PermissionResponse): void {
    this.updateCallback?.({ permissionRequest: null });
    if (this.pendingPermissionResolve) {
      this.pendingPermissionResolve();
      this.pendingPermissionResolve = null;
    }
  }
}
