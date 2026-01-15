import type {
  AcpAdapter,
  AcpAdapterOptions,
  AcpCompletionResult,
  AcpMessageHandler,
} from "#adapters/acp";
import type {
  Message,
  RichMessage,
  SessionState,
} from "#parsers/message-types";
import {
  isMessage,
  isPlanMessage,
  isResultMessage,
  isToolUseBlock,
} from "#parsers/message-types";
import type { AppState, StateProvider } from "#providers/state";
import { computeTotals } from "#providers/state";

export interface AcpStateProviderOptions extends AcpAdapterOptions {
  prompt: string;
  maxIterations?: number;
}

type StateUpdateCallback = (update: Partial<AppState>) => void;

/**
 * Bridges AcpAdapter to the TUI by implementing StateProvider.
 * Converts ACP messages to state updates for the harness UI.
 * Handles text chunk accumulation, session management, and multi-iteration loops.
 */
export class AcpStateProvider implements StateProvider {
  private readonly adapter: AcpAdapter;
  private readonly options: AcpStateProviderOptions;
  private readonly maxIterations: number;
  private callback?: StateUpdateCallback;
  private started = false;
  private iteration = 1;

  // Session management
  private currentSession: SessionState | null = null;
  private sessions: SessionState[] = [];

  // Text accumulation state
  private textBuffer = "";
  private lastTextTimestamp = 0;
  private accumulatedMessageIndex = -1;

  constructor(adapter: AcpAdapter, options: AcpStateProviderOptions) {
    this.adapter = adapter;
    this.options = options;
    this.maxIterations = options.maxIterations ?? 10;
  }

  getInitialState(): AppState {
    return {
      sessions: [],
      status: "idle",
      iteration: 1,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      toolCallCount: 0,
      prdItems: [],
    };
  }

  subscribe(callback: StateUpdateCallback): () => void {
    this.callback = callback;
    return () => {
      this.callback = undefined;
    };
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.runIteration();
  }

  stop(): void {
    // Mark current session as error if running
    if (this.currentSession?.status === "running") {
      this.currentSession = { ...this.currentSession, status: "error" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.callback?.({ sessions: this.sessions });
    }
    this.adapter.cancel().catch(() => {
      // Ignore cancel errors
    });
  }

  pause(): void {
    if (this.currentSession?.status === "running") {
      this.adapter.pause?.();
      this.currentSession = { ...this.currentSession, status: "paused" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.callback?.({ status: "paused", sessions: this.sessions });
    }
  }

  resume(): void {
    if (this.currentSession?.status === "paused") {
      this.adapter.resume?.();
      this.currentSession = { ...this.currentSession, status: "running" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.callback?.({ status: "running", sessions: this.sessions });
    }
  }

  private runIteration(): void {
    // Reset text accumulation for new iteration
    this.flushTextBuffer();

    // Create new session for this iteration
    this.currentSession = {
      id: `acp-${Date.now()}`,
      iteration: this.iteration,
      cwd: this.options.cwd ?? process.cwd(),
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

    // Emit state update
    this.callback?.({
      status: "running",
      iteration: this.iteration,
      sessions: this.sessions,
    });

    // Create handler for this iteration
    const handler: AcpMessageHandler = {
      onMessage: (message) => this.handleMessage(message),
      onComplete: (result) => this.handleComplete(result),
      onError: (error) => this.handleError(error),
    };

    // Run the adapter (async, errors handled via callbacks)
    this.adapter.run(this.options.prompt, this.options, handler).catch(() => {
      this.handleError(new Error("Adapter run failed"));
    });
  }

  private handleMessage(message: RichMessage): void {
    if (message.type === "text_delta") {
      // Accumulate text chunks
      this.textBuffer += message.text;
      this.lastTextTimestamp = message.timestamp;
      this.emitAccumulatedText();
    } else if (isPlanMessage(message)) {
      // Update session plan (not added to messages array)
      if (this.currentSession) {
        this.currentSession = {
          ...this.currentSession,
          plan: message.entries,
        };
        this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      }
      this.emitStateUpdate();
    } else {
      // Flush text buffer before non-text message
      this.flushTextBuffer();

      // Add to current session
      if (this.currentSession) {
        this.currentSession = {
          ...this.currentSession,
          messages: [...this.currentSession.messages, message],
        };

        // Update usage tracking
        this.updateSessionUsage(message);

        this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      }

      this.emitStateUpdate();
    }
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

  private emitAccumulatedText(): void {
    if (!this.currentSession) {
      return;
    }

    // Create accumulated text message
    const textMessage: Message = {
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: this.textBuffer }],
      timestamp: this.lastTextTimestamp,
    };

    // Update current session messages
    const sessionMessages = this.currentSession.messages;
    if (this.accumulatedMessageIndex >= 0) {
      this.currentSession = {
        ...this.currentSession,
        messages: [
          ...sessionMessages.slice(0, this.accumulatedMessageIndex),
          textMessage,
          ...sessionMessages.slice(this.accumulatedMessageIndex + 1),
        ],
      };
    } else {
      this.accumulatedMessageIndex = sessionMessages.length;
      this.currentSession = {
        ...this.currentSession,
        messages: [...sessionMessages, textMessage],
      };
    }
    this.sessions = [...this.sessions.slice(0, -1), this.currentSession];

    this.emitStateUpdate();
  }

  private emitStateUpdate(): void {
    const totals = computeTotals(this.sessions);
    this.callback?.({
      sessions: this.sessions,
      totalInputTokens: totals.inputTokens,
      totalOutputTokens: totals.outputTokens,
      totalCost: totals.cost,
      toolCallCount: totals.toolCallCount,
    });
  }

  private flushTextBuffer(): void {
    this.textBuffer = "";
    this.accumulatedMessageIndex = -1;
  }

  private handleComplete(_result: AcpCompletionResult): void {
    // Flush any remaining text
    this.flushTextBuffer();

    // Mark current session as complete and freeze it
    if (this.currentSession) {
      const completedSession: SessionState = Object.freeze({
        ...this.currentSession,
        status: "complete" as const,
        endTime: Date.now(),
      });
      this.sessions = [...this.sessions.slice(0, -1), completedSession];
      this.currentSession = null;
      this.emitStateUpdate();
    }

    if (this.iteration < this.maxIterations) {
      // Continue to next iteration - defer to allow current run() to complete cleanup
      this.iteration++;
      setTimeout(() => this.runIteration(), 100);
    } else {
      // All iterations done
      this.callback?.({ status: "complete" });
    }
  }

  private handleError(_error: Error): void {
    // Mark current session as error and freeze it
    if (this.currentSession) {
      const errorSession: SessionState = Object.freeze({
        ...this.currentSession,
        status: "error" as const,
        endTime: Date.now(),
      });
      this.sessions = [...this.sessions.slice(0, -1), errorSession];
      this.currentSession = null;
    }
    this.callback?.({ status: "error", sessions: this.sessions });
  }
}
