import type {
  AcpAdapter,
  AcpAdapterOptions,
  AcpCompletionResult,
  AcpMessageHandler,
} from "#adapters/acp";
import { Log } from "#log";
import type {
  Message,
  RichMessage,
  SessionState,
  ToolBlock,
  ToolCallContent,
  ToolKind,
  ToolReference,
} from "#parsers/message-types";
import {
  isMessage,
  isPlanMessage,
  isResultMessage,
  isTerminalBlock,
  isToolResultBlock,
  isToolUseBlock,
} from "#parsers/message-types";
import type {
  PermissionRequest,
  PermissionResponse,
  PermissionSummary,
} from "#parsers/permission-types";
import type { AppState, OpenCommand, StateProvider } from "#providers/state";
import { computeTotals } from "#providers/state";
import { formatPermissionName } from "#utils/permission-formatter";

const log = Log.create({ service: "state" });

export interface AcpStateProviderOptions extends AcpAdapterOptions {
  prompt: string;
  maxIterations?: number;
  yolo?: boolean;
}

interface DeferredPermission {
  request: PermissionRequest;
  resolve: (response: PermissionResponse) => void;
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

  // Permission handling - queue to handle concurrent requests
  private readonly pendingPermissions = new Map<string, DeferredPermission>();
  private currentPermissionId: string | null = null;

  // Permission tracking for summary (keyed by "status:formattedName")
  private readonly trackedPermissions = new Map<
    string,
    { formattedName: string; status: "allowed" | "denied"; count: number }
  >();

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
      permissionRequest: null,
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

  async pause(): Promise<void> {
    if (this.currentSession?.status === "running") {
      log.debug("pause", { sessionId: this.currentSession.id });
      await this.adapter.pause?.();
      this.currentSession = { ...this.currentSession, status: "paused" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.callback?.({ status: "paused", sessions: this.sessions });
    }
  }

  resume(): void {
    if (this.currentSession?.status === "paused") {
      log.debug("resume", { sessionId: this.currentSession.id });
      this.currentSession = { ...this.currentSession, status: "running" };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      this.callback?.({ status: "running", sessions: this.sessions });

      // Continue the paused session
      const handler: AcpMessageHandler = {
        onMessage: (message) => this.handleMessage(message),
        onComplete: (result) => this.handleComplete(result),
        onError: (error) => this.handleError(error),
      };
      this.adapter.continueSession?.(handler);
    }
  }

  canOpen(): boolean {
    return this.adapter.getResumeCommand("test") !== null;
  }

  getOpenCommand(): OpenCommand | null {
    const sessionId = this.adapter.getSessionId();
    if (!sessionId) {
      return null;
    }
    return this.adapter.getResumeCommand(sessionId);
  }

  resolvePermission(response: PermissionResponse): void {
    if (this.currentPermissionId) {
      const pending = this.pendingPermissions.get(this.currentPermissionId);
      if (pending) {
        pending.resolve(response);
        this.pendingPermissions.delete(this.currentPermissionId);
      }
      this.currentPermissionId = null;

      // Show next pending permission if any
      this.showNextPermission();
    }
  }

  private showNextPermission(): void {
    const nextEntry = this.pendingPermissions.entries().next();
    if (nextEntry.done) {
      this.callback?.({ permissionRequest: null });
    } else {
      const [id, deferred] = nextEntry.value;
      this.currentPermissionId = id;
      this.callback?.({ permissionRequest: deferred.request });
    }
  }

  private handlePermissionRequest(
    request: PermissionRequest
  ): Promise<PermissionResponse> {
    return new Promise((resolve) => {
      const id = request.toolCall.toolCallId;
      const formattedName = formatPermissionName(request.toolCall);

      // Wrap resolve to track outcome
      const trackingResolve = (response: PermissionResponse) => {
        const status = response.outcome === "selected" ? "allowed" : "denied";
        this.addTrackedPermission(formattedName, status);
        resolve(response);
      };

      this.pendingPermissions.set(id, { request, resolve: trackingResolve });

      // Show this permission if none currently shown
      if (!this.currentPermissionId) {
        this.currentPermissionId = id;
        this.callback?.({ permissionRequest: request });
      }
    });
  }

  /** Track a permission from auto-approval (yolo, cached, fallback) */
  trackPermission(formattedName: string, status: "allowed" | "denied"): void {
    this.addTrackedPermission(formattedName, status);
  }

  /** Add or increment a tracked permission and emit updated summary */
  private addTrackedPermission(
    formattedName: string,
    status: "allowed" | "denied"
  ): void {
    const key = `${status}:${formattedName}`;
    const existing = this.trackedPermissions.get(key);
    if (existing) {
      existing.count++;
    } else {
      this.trackedPermissions.set(key, { formattedName, status, count: 1 });
    }
    // Emit updated summary for live tracking
    this.callback?.({ permissionSummary: this.getPermissionSummary() });
  }

  /** Get summarized permissions for display */
  getPermissionSummary(): PermissionSummary[] {
    return Array.from(this.trackedPermissions.values()).map((p) => ({ ...p }));
  }

  private runIteration(): void {
    log.debug("iteration_start", { iteration: this.iteration });
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
      toolCalls: new Map(),
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

    // Build adapter options with permission handler
    const adapterOptions = {
      ...this.options,
      onPermissionRequest: (req: PermissionRequest) =>
        this.handlePermissionRequest(req),
      onPermissionTracked: (name: string, status: "allowed" | "denied") =>
        this.trackPermission(name, status),
    };

    // Run the adapter (async, errors handled via callbacks)
    this.adapter.run(this.options.prompt, adapterOptions, handler).catch(() => {
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
    } else if (isMessage(message)) {
      // Check for tool_use or tool_result blocks
      const toolUseBlocks = message.content.filter(isToolUseBlock);
      const toolResultBlocks = message.content.filter(isToolResultBlock);
      const terminalBlocks = message.content.filter(isTerminalBlock);

      // Filter out tool blocks from message content for the messages array
      const isToolRelated = (
        b: import("#parsers/message-types").ContentBlock
      ) => isToolUseBlock(b) || isToolResultBlock(b) || isTerminalBlock(b);
      const nonToolContent = message.content.filter((b) => !isToolRelated(b));

      // Only add message if it has non-tool content
      if (nonToolContent.length > 0 && this.currentSession) {
        this.flushTextBuffer();
        const filteredMessage: Message = {
          ...message,
          content: nonToolContent,
        };
        this.currentSession = {
          ...this.currentSession,
          messages: [...this.currentSession.messages, filteredMessage],
        };
        this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
      }

      if (toolUseBlocks.length > 0 || toolResultBlocks.length > 0) {
        // Flush text before processing tool blocks
        this.flushTextBuffer();
        // Process tool blocks into toolCalls map
        this.processToolBlocks(toolUseBlocks, toolResultBlocks, terminalBlocks);

        // Insert tool references for each tool_use block
        if (this.currentSession && toolUseBlocks.length > 0) {
          const toolRefs: ToolReference[] = toolUseBlocks.map((block) => ({
            type: "tool_reference" as const,
            toolCallId: block.id,
            timestamp: Date.now(),
          }));
          this.currentSession = {
            ...this.currentSession,
            messages: [...this.currentSession.messages, ...toolRefs],
          };
          this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
        }
      }

      // Update usage tracking
      this.updateSessionUsage(message);
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

  private processToolBlocks(
    toolUseBlocks: import("#parsers/message-types").ToolUseBlock[],
    toolResultBlocks: import("#parsers/message-types").ToolResultBlock[],
    terminalBlocks: import("#parsers/message-types").TerminalBlock[]
  ): void {
    if (!this.currentSession) {
      return;
    }

    const toolCalls = new Map(this.currentSession.toolCalls);

    for (const block of toolUseBlocks) {
      this.addToolUseBlock(toolCalls, block);
    }
    for (const block of toolResultBlocks) {
      this.updateToolWithResult(toolCalls, block);
    }
    for (const block of terminalBlocks) {
      this.attachTerminalToTool(toolCalls, block);
    }

    this.currentSession = { ...this.currentSession, toolCalls };
    this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
  }

  private addToolUseBlock(
    toolCalls: Map<string, ToolBlock>,
    block: import("#parsers/message-types").ToolUseBlock
  ): void {
    const toolBlock: ToolBlock = {
      type: "tool",
      toolCallId: block.id,
      title: block.name,
      kind: block.kind as ToolKind,
      status: block.status ?? "pending",
      locations: block.locations,
      rawInput: block.input,
    };
    toolCalls.set(block.id, toolBlock);
  }

  private updateToolWithResult(
    toolCalls: Map<string, ToolBlock>,
    block: import("#parsers/message-types").ToolResultBlock
  ): void {
    const existing = toolCalls.get(block.tool_use_id);
    if (!existing) {
      return;
    }

    const content: ToolCallContent[] = existing.content ?? [];
    const text = this.extractResultText(block.content);
    if (text) {
      content.push({ type: "content", content: { type: "text", text } });
    }

    toolCalls.set(block.tool_use_id, {
      ...existing,
      status: block.is_error ? "failed" : "completed",
      rawOutput: block.content,
      content,
    });
  }

  private extractResultText(
    content: string | Array<{ type: string; text?: string }> | undefined
  ): string {
    if (!content) {
      return "";
    }
    if (typeof content === "string") {
      return content;
    }
    return content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("");
  }

  private attachTerminalToTool(
    toolCalls: Map<string, ToolBlock>,
    block: import("#parsers/message-types").TerminalBlock
  ): void {
    for (const [id, tool] of toolCalls) {
      if (tool.status === "in_progress" || tool.status === "pending") {
        const content: ToolCallContent[] = tool.content ?? [];
        content.push({ type: "terminal", terminalId: block.terminalId });
        toolCalls.set(id, { ...tool, content });
        break;
      }
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
    log.debug("state_update", {
      sessionCount: this.sessions.length,
      status: this.currentSession?.status,
    });
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

  private handleComplete(result: AcpCompletionResult): void {
    log.debug("iteration_complete", {
      iteration: this.iteration,
      stopReason: result.stopReason,
    });
    this.flushTextBuffer();

    // If paused, keep session state and don't continue
    if (this.adapter.isPaused?.()) {
      log.debug("iteration_paused", { iteration: this.iteration });
      if (this.currentSession) {
        this.emitStateUpdate();
      }
      return;
    }

    // Mark current session as complete and freeze it
    if (this.currentSession) {
      const completedSession: SessionState = {
        ...this.currentSession,
        toolCalls: new Map(this.currentSession.toolCalls),
        status: "complete" as const,
        endTime: Date.now(),
      };
      this.sessions = [...this.sessions.slice(0, -1), completedSession];
      this.currentSession = null;
      this.emitStateUpdate();
    }

    if (this.iteration < this.maxIterations) {
      // Continue to next iteration - defer to allow current run() to complete cleanup
      this.iteration++;
      setTimeout(() => this.runIteration(), 100);
    } else {
      // All iterations done - include permission summary
      this.callback?.({
        status: "complete",
        permissionSummary: this.getPermissionSummary(),
      });
    }
  }

  private handleError(_error: Error): void {
    // Mark current session as error and freeze it
    if (this.currentSession) {
      const errorSession: SessionState = {
        ...this.currentSession,
        toolCalls: new Map(this.currentSession.toolCalls),
        status: "error" as const,
        endTime: Date.now(),
      };
      this.sessions = [...this.sessions.slice(0, -1), errorSession];
      this.currentSession = null;
    }
    this.callback?.({
      status: "error",
      sessions: this.sessions,
      permissionSummary: this.getPermissionSummary(),
    });
  }
}
