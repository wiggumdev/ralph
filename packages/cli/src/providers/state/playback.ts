import type { ToolKind } from "@agentclientprotocol/sdk";
import type {
  AgentBlock,
  ContentBlock,
  Message,
  RichMessage,
  SessionItem,
  SessionState,
  ToolBlock,
  ToolCallContent,
  ToolResultBlock,
  ToolUseBlock,
} from "#parsers/message-types";
import {
  findAgentById,
  findToolById,
  isMessage,
  isResultMessage,
  isTerminalBlock,
  isToolResultBlock,
  isToolUseBlock,
  updateItemById,
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

  // Agent tracking - stack for nested agents (toolCallIds)
  private readonly activeAgentStack: string[] = [];

  // ID counter for items
  private itemIdCounter = 0;

  constructor(config: PlaybackConfig) {
    this.config = config;
    this.maxIterations = config.iterations.length;
  }

  private generateItemId(): string {
    return `item-${Date.now()}-${this.itemIdCounter++}`;
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
      items: [],
      usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
      todos: [],
      startTime: Date.now(),
      collapsed: true,
      status: "running",
      activity: "idle",
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
      const frozenSession: SessionState = {
        ...this.currentSession,
        status: "complete" as const,
        endTime: Date.now(),
        collapsed: true,
      };
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

  // --- Item management helpers ---

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

  private processMessage(message: RichMessage): void {
    if (!this.currentSession) {
      return;
    }

    if (isMessage(message)) {
      // Check for tool_use or tool_result blocks
      const toolUseBlocks = message.content.filter(isToolUseBlock);
      const toolResultBlocks = message.content.filter(isToolResultBlock);
      const terminalBlocks = message.content.filter(isTerminalBlock);

      // Filter out tool blocks from message content
      const isToolRelated = (b: ContentBlock) =>
        isToolUseBlock(b) || isToolResultBlock(b) || isTerminalBlock(b);
      const nonToolContent = message.content.filter((b) => !isToolRelated(b));

      // Only add message if it has non-tool content
      if (nonToolContent.length > 0) {
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

      if (toolUseBlocks.length > 0 || toolResultBlocks.length > 0) {
        this.processToolBlocks(toolUseBlocks, toolResultBlocks, terminalBlocks);
      }
    } else {
      // Handle non-Message types
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
      } else if (message.type === "text_delta") {
        item = {
          type: "text_delta",
          id: this.generateItemId(),
          data: message as import("#parsers/message-types").TextDelta,
        };
      } else if (message.type === "thinking_delta") {
        item = {
          type: "thinking_delta",
          id: this.generateItemId(),
          data: message as import("#parsers/message-types").ThinkingDelta,
        };
      } else if (message.type === "plan") {
        item = {
          type: "plan",
          id: this.generateItemId(),
          data: message as import("#parsers/message-types").PlanMessage,
        };
      } else {
        return;
      }
      this.addItem(item);
    }

    // Update usage stats
    this.updateSessionUsage(message);

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

  private isTaskTool(name: string): boolean {
    return name.toLowerCase() === "task";
  }

  private getCurrentAgentId(): string | null {
    return this.activeAgentStack.length > 0
      ? (this.activeAgentStack.at(-1) ?? null)
      : null;
  }

  private startAgentBlock(block: ToolUseBlock): void {
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

  private processToolBlocks(
    toolUseBlocks: ToolUseBlock[],
    toolResultBlocks: ToolResultBlock[],
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

  private addToolBlock(block: ToolUseBlock): void {
    const toolBlock: ToolBlock = {
      type: "tool",
      toolCallId: block.id,
      title: block.name,
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

  private updateToolWithResult(block: ToolResultBlock): void {
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
