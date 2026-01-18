import type { ToolKind } from "@agentclientprotocol/sdk";
import type {
  AcpAdapter,
  AcpAdapterOptions,
  AcpCompletionResult,
  AcpMessageHandler,
} from "#adapters/acp";
import { Log } from "#log";
import type {
  AgentBlock,
  Message,
  RichMessage,
  SessionActivity,
  SessionItem,
  SessionState,
  ThinkingDelta,
  ToolBlock,
  ToolCallContent,
} from "#parsers/message-types";
import {
  findAgentById,
  findToolById,
  isMessage,
  isPlanMessage,
  isResultMessage,
  isTerminalBlock,
  isThinkingDelta,
  isToolResultBlock,
  isToolUseBlock,
  updateItemById,
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
  transportLog?: boolean;
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
  private accumulatedTextItemId: string | null = null;

  // Thinking accumulation state
  private thinkingBuffer = "";
  private lastThinkingTimestamp = 0;
  private accumulatedThinkingItemId: string | null = null;

  // Permission handling - queue to handle concurrent requests
  private readonly pendingPermissions = new Map<string, DeferredPermission>();
  private currentPermissionId: string | null = null;

  // Permission tracking for summary (keyed by "status:formattedName")
  private readonly trackedPermissions = new Map<
    string,
    { formattedName: string; status: "allowed" | "denied"; count: number }
  >();

  // Agent tracking - stack for nested agents (toolCallIds)
  private readonly activeAgentStack: string[] = [];

  // ID counter for items
  private itemIdCounter = 0;

  constructor(adapter: AcpAdapter, options: AcpStateProviderOptions) {
    this.adapter = adapter;
    this.options = options;
    this.maxIterations = options.maxIterations ?? 10;
  }

  private generateItemId(): string {
    return `item-${Date.now()}-${this.itemIdCounter++}`;
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
    return this.adapter.supportsLoadSession();
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
      const formattedName = formatPermissionName(
        request.toolCall,
        request.resolvedToolName
      );

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
    // Reset text and thinking accumulation for new iteration
    this.flushTextBuffer();
    this.flushThinkingBuffer();

    // Create new session for this iteration
    this.currentSession = {
      id: `acp-${Date.now()}`,
      iteration: this.iteration,
      cwd: this.options.cwd ?? process.cwd(),
      mcpServers: [],
      availableCommands: [],
      items: [],
      usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
      todos: [],
      startTime: Date.now(),
      collapsed: true,
      status: "running",
      activity: "idle",
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

  private updateActivity(activity: SessionActivity): void {
    if (this.currentSession && this.currentSession.activity !== activity) {
      this.currentSession = { ...this.currentSession, activity };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
    }
  }

  // --- Item management helpers ---

  private findItemById(id: string): SessionItem | undefined {
    if (!this.currentSession) {
      return undefined;
    }
    // Check session items
    const found = this.currentSession.items.find((i) => i.id === id);
    if (found) {
      return found;
    }
    // Check agent items (nested)
    for (const item of this.currentSession.items) {
      if (item.type === "agent") {
        const agentItem = item.data.items.find((i) => i.id === id);
        if (agentItem) {
          return agentItem;
        }
      }
    }
    return undefined;
  }

  private addItem(item: SessionItem): void {
    if (!this.currentSession) {
      return;
    }

    const agentId = this.getCurrentAgentId();
    if (agentId) {
      // Add to current agent's items
      this.currentSession = {
        ...this.currentSession,
        items: updateItemById(
          this.currentSession.items,
          agentId,
          (agentItem) =>
            agentItem.type === "agent"
              ? {
                  ...agentItem,
                  data: {
                    ...agentItem.data,
                    items: [...agentItem.data.items, item],
                  },
                }
              : agentItem
        ),
      };
    } else {
      // Add to session items
      this.currentSession = {
        ...this.currentSession,
        items: [...this.currentSession.items, item],
      };
    }
    this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
  }

  private updateItem(
    id: string,
    updater: (item: SessionItem) => SessionItem
  ): void {
    if (!this.currentSession) {
      return;
    }

    // Try to update in session items first
    const found = this.currentSession.items.some((i) => i.id === id);
    if (found) {
      this.currentSession = {
        ...this.currentSession,
        items: updateItemById(this.currentSession.items, id, updater),
      };
    } else {
      // Search in agent items
      this.currentSession = {
        ...this.currentSession,
        items: this.currentSession.items.map((item) => {
          if (item.type === "agent") {
            const agentData = item.data;
            const foundInAgent = agentData.items.some((i) => i.id === id);
            if (foundInAgent) {
              return {
                ...item,
                data: {
                  ...agentData,
                  items: updateItemById(agentData.items, id, updater),
                },
              };
            }
          }
          return item;
        }),
      };
    }
    this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
  }

  // --- Message handling ---

  private handleMessage(message: RichMessage): void {
    if (isThinkingDelta(message)) {
      this.handleThinkingDelta(message);
    } else if (message.type === "text_delta") {
      this.handleTextDelta(message);
    } else if (isPlanMessage(message)) {
      this.handlePlanMessage(message);
    } else if (isMessage(message)) {
      this.handleContentMessage(message);
    } else {
      this.handleOtherMessage(message);
    }
  }

  private handleThinkingDelta(message: ThinkingDelta): void {
    // Flush text buffer before thinking (separate accumulation)
    this.flushTextBuffer();
    // Accumulate thinking chunks
    this.thinkingBuffer += message.text;
    this.lastThinkingTimestamp = message.timestamp;
    this.updateActivity("thinking");
    this.emitAccumulatedThinking();
  }

  private handleTextDelta(message: RichMessage & { type: "text_delta" }): void {
    // Flush thinking buffer before text
    this.flushThinkingBuffer();
    // Accumulate text chunks
    this.textBuffer += message.text;
    this.lastTextTimestamp = message.timestamp;
    this.updateActivity("responding");
    this.emitAccumulatedText();
  }

  private handlePlanMessage(
    message: import("#parsers/message-types").PlanMessage
  ): void {
    // Update session plan (not added to items array)
    if (this.currentSession) {
      this.currentSession = {
        ...this.currentSession,
        plan: message.entries,
      };
      this.sessions = [...this.sessions.slice(0, -1), this.currentSession];
    }
    this.emitStateUpdate();
  }

  private handleContentMessage(message: Message): void {
    // Check for tool_use or tool_result blocks
    const toolUseBlocks = message.content.filter(isToolUseBlock);
    const toolResultBlocks = message.content.filter(isToolResultBlock);
    const terminalBlocks = message.content.filter(isTerminalBlock);

    // Update activity for tool execution
    if (toolUseBlocks.length > 0) {
      this.updateActivity("tool_executing");
    }

    // Filter out tool blocks from message content
    const isToolRelated = (b: import("#parsers/message-types").ContentBlock) =>
      isToolUseBlock(b) || isToolResultBlock(b) || isTerminalBlock(b);
    const nonToolContent = message.content.filter((b) => !isToolRelated(b));

    // Only add message if it has non-tool content
    if (nonToolContent.length > 0 && this.currentSession) {
      this.flushTextBuffer();
      this.flushThinkingBuffer();
      const filteredMessage: Message = {
        ...message,
        content: nonToolContent,
      };
      const item: SessionItem = {
        type: "message",
        id: this.generateItemId(),
        data: filteredMessage,
      };
      this.addItem(item);
    }

    // Process tool blocks
    if (toolUseBlocks.length > 0 || toolResultBlocks.length > 0) {
      this.flushTextBuffer();
      this.flushThinkingBuffer();
      this.processToolBlocks(toolUseBlocks, toolResultBlocks, terminalBlocks);
    }

    // Update usage tracking
    this.updateSessionUsage(message);
    this.emitStateUpdate();
  }

  private handleOtherMessage(message: RichMessage): void {
    // Flush text buffer before non-text message
    this.flushTextBuffer();
    this.flushThinkingBuffer();

    if (!this.currentSession) {
      return;
    }

    // Create appropriate item based on message type
    let item: SessionItem;
    if (message.type === "system") {
      item = {
        type: "system",
        id: this.generateItemId(),
        data: message as import("#parsers/message-types").SystemMessage,
      };
    } else if (message.type === "result") {
      item = {
        type: "result",
        id: this.generateItemId(),
        data: message as import("#parsers/message-types").ResultMessage,
      };
    } else {
      // Fallback - shouldn't happen with current types
      return;
    }

    this.addItem(item);
    this.updateSessionUsage(message);
    this.emitStateUpdate();
  }

  private processToolBlocks(
    toolUseBlocks: import("#parsers/message-types").ToolUseBlock[],
    toolResultBlocks: import("#parsers/message-types").ToolResultBlock[],
    terminalBlocks: import("#parsers/message-types").TerminalBlock[]
  ): void {
    if (!this.currentSession) {
      return;
    }

    for (const block of toolUseBlocks) {
      if (this.isTaskTool(block.name)) {
        this.startAgentBlock(block);
      } else {
        this.addToolBlock(block);
      }
    }

    for (const block of toolResultBlocks) {
      this.updateToolWithResult(block);
    }

    for (const block of terminalBlocks) {
      this.attachTerminalToTool(block);
    }
  }

  private isTaskTool(name: string): boolean {
    return name.toLowerCase() === "task";
  }

  private startAgentBlock(
    block: import("#parsers/message-types").ToolUseBlock
  ): void {
    // Check if agent already exists - if so, update it
    const existing = this.findItemById(block.id);
    if (existing) {
      this.updateItem(block.id, (item) => {
        if (item.type !== "agent") {
          return item;
        }
        return {
          ...item,
          data: {
            ...item.data,
            status: block.status ?? item.data.status,
          },
        };
      });
      return;
    }

    const title =
      typeof block.input?.description === "string"
        ? block.input.description
        : "Agent";

    const agentBlock: AgentBlock = {
      type: "agent",
      toolCallId: block.id,
      title,
      status: block.status ?? "pending",
      items: [],
      startTime: Date.now(),
      collapsed: true,
    };

    const item: SessionItem = {
      type: "agent",
      id: block.id,
      data: agentBlock,
    };

    // Add to parent agent or session
    this.addItem(item);
    this.activeAgentStack.push(block.id);
  }

  private completeAgentBlock(toolCallId: string, isError: boolean): void {
    this.updateItem(toolCallId, (item) =>
      item.type === "agent"
        ? {
            ...item,
            data: {
              ...item.data,
              status: isError ? "failed" : "completed",
              endTime: Date.now(),
            },
          }
        : item
    );

    // Pop from stack
    const stackIndex = this.activeAgentStack.indexOf(toolCallId);
    if (stackIndex >= 0) {
      this.activeAgentStack.splice(stackIndex, 1);
    }
  }

  private getCurrentAgentId(): string | null {
    return this.activeAgentStack.length > 0
      ? (this.activeAgentStack.at(-1) ?? null)
      : null;
  }

  private addToolBlock(
    block: import("#parsers/message-types").ToolUseBlock
  ): void {
    // Check if tool already exists - if so, update it
    const existing = this.findItemById(block.id);
    if (existing) {
      this.updateItem(block.id, (item) => {
        if (item.type !== "tool") {
          return item;
        }
        return {
          ...item,
          data: {
            ...item.data,
            status: block.status ?? item.data.status,
          },
        };
      });
      return;
    }

    const toolBlock: ToolBlock = {
      type: "tool",
      toolCallId: block.id,
      title: block.name,
      resolvedName: block.resolvedName,
      kind: block.kind as ToolKind,
      status: block.status ?? "pending",
      locations: block.locations,
      rawInput: block.input,
    };

    const item: SessionItem = {
      type: "tool",
      id: block.id,
      data: toolBlock,
    };

    this.addItem(item);
  }

  private updateToolWithResult(
    block: import("#parsers/message-types").ToolResultBlock
  ): void {
    // Check if this is a Task tool completion
    const agentBlock = findAgentById(
      this.currentSession?.items ?? [],
      block.tool_use_id
    );
    if (agentBlock) {
      this.completeAgentBlock(block.tool_use_id, !!block.is_error);
      return;
    }

    // Find and update the tool
    const existingTool = findToolById(
      this.currentSession?.items ?? [],
      block.tool_use_id
    );

    // Also check in agent items
    let foundInAgent = false;
    if (!existingTool && this.currentSession) {
      for (const item of this.currentSession.items) {
        if (item.type === "agent") {
          const agentTool = findToolById(item.data.items, block.tool_use_id);
          if (agentTool) {
            foundInAgent = true;
            break;
          }
        }
      }
    }

    if (!(existingTool || foundInAgent)) {
      return;
    }

    this.updateItem(block.tool_use_id, (item) => {
      if (item.type !== "tool") {
        return item;
      }
      const existing = item.data;
      const content: ToolCallContent[] = existing.content ?? [];
      const text = this.extractResultText(block.content);
      if (text) {
        content.push({ type: "content", content: { type: "text", text } });
      }
      return {
        ...item,
        data: {
          ...existing,
          status: block.is_error ? "failed" : "completed",
          rawOutput: block.content,
          content,
        },
      };
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
    block: import("#parsers/message-types").TerminalBlock
  ): void {
    if (!this.currentSession) {
      return;
    }

    // Find first in-progress or pending tool
    for (const item of this.currentSession.items) {
      if (item.type === "tool") {
        const tool = item.data;
        if (tool.status === "in_progress" || tool.status === "pending") {
          this.updateItem(item.id, (i) => {
            if (i.type !== "tool") {
              return i;
            }
            const content: ToolCallContent[] = i.data.content ?? [];
            content.push({ type: "terminal", terminalId: block.terminalId });
            return { ...i, data: { ...i.data, content } };
          });
          return;
        }
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

    if (this.accumulatedTextItemId) {
      // Update existing item
      this.updateItem(this.accumulatedTextItemId, () => ({
        type: "text_delta",
        id: this.accumulatedTextItemId!,
        data: {
          type: "text_delta",
          text: this.textBuffer,
          timestamp: this.lastTextTimestamp,
        },
      }));
    } else {
      // Add new item
      this.accumulatedTextItemId = this.generateItemId();
      const item: SessionItem = {
        type: "text_delta",
        id: this.accumulatedTextItemId,
        data: {
          type: "text_delta",
          text: this.textBuffer,
          timestamp: this.lastTextTimestamp,
        },
      };
      this.addItem(item);
    }

    this.sessions = [...this.sessions.slice(0, -1), this.currentSession!];
    this.emitStateUpdate();
  }

  private emitAccumulatedThinking(): void {
    if (!this.currentSession) {
      return;
    }

    if (this.accumulatedThinkingItemId) {
      // Update existing item
      this.updateItem(this.accumulatedThinkingItemId, () => ({
        type: "thinking_delta",
        id: this.accumulatedThinkingItemId!,
        data: {
          type: "thinking_delta",
          text: this.thinkingBuffer,
          timestamp: this.lastThinkingTimestamp,
        },
      }));
    } else {
      // Add new item
      this.accumulatedThinkingItemId = this.generateItemId();
      const item: SessionItem = {
        type: "thinking_delta",
        id: this.accumulatedThinkingItemId,
        data: {
          type: "thinking_delta",
          text: this.thinkingBuffer,
          timestamp: this.lastThinkingTimestamp,
        },
      };
      this.addItem(item);
    }

    this.sessions = [...this.sessions.slice(0, -1), this.currentSession!];
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
    this.accumulatedTextItemId = null;
  }

  private flushThinkingBuffer(): void {
    this.thinkingBuffer = "";
    this.accumulatedThinkingItemId = null;
  }

  private handleComplete(result: AcpCompletionResult): void {
    log.debug("iteration_complete", {
      iteration: this.iteration,
      stopReason: result.stopReason,
    });
    this.flushTextBuffer();
    this.flushThinkingBuffer();
    this.updateActivity("idle");

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

  private handleError(error: Error): void {
    log.error("iteration_error", {
      iteration: this.iteration,
      error: error.message,
    });

    // Flush any pending text and thinking
    this.flushTextBuffer();
    this.flushThinkingBuffer();
    this.updateActivity("idle");

    // Mark current session as error and freeze it
    if (this.currentSession) {
      const errorSession: SessionState = {
        ...this.currentSession,
        status: "error" as const,
        endTime: Date.now(),
      };
      this.sessions = [...this.sessions.slice(0, -1), errorSession];
      this.currentSession = null;
    }

    // Ensure adapter is cleaned up
    this.adapter.cancel().catch(() => {
      // Ignore cleanup errors
    });

    this.callback?.({
      status: "error",
      sessions: this.sessions,
      permissionSummary: this.getPermissionSummary(),
    });
  }
}
