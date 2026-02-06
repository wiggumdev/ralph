import type { ToolKind } from "@agentclientprotocol/sdk";
import type {
  AgentBlock,
  ContentBlock,
  Message,
  PlanMessage,
  ResultMessage,
  RichMessage,
  SessionItem,
  SessionState,
  TextDelta,
  ThinkingDelta,
  ToolBlock,
  ToolCallContent,
  ToolResultBlock,
  ToolUseBlock,
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
import type { LoopContext } from "../types";

// Regex for detecting promise completion tag (case-insensitive)
const PROMISE_COMPLETE_REGEX = /<promise>complete<\/promise>/i;

// --- ID Generation ---

export function generateItemId(ctx: LoopContext): string {
  return `item-${Date.now()}-${ctx.itemIdCounter}`;
}

// --- Buffer Management ---

export function flushTextBuffer(): Partial<LoopContext> {
  return {
    textBuffer: "",
    accumulatedTextItemId: null,
  };
}

export function flushThinkingBuffer(): Partial<LoopContext> {
  return {
    thinkingBuffer: "",
    accumulatedThinkingItemId: null,
  };
}

// --- Item Management ---

function getCurrentAgentId(ctx: LoopContext): string | null {
  return ctx.activeAgentStack.length > 0
    ? (ctx.activeAgentStack.at(-1) ?? null)
    : null;
}

function addItemToSession(
  session: SessionState,
  item: SessionItem,
  agentId: string | null
): SessionState {
  if (agentId) {
    return {
      ...session,
      items: updateItemById(session.items, agentId, (agentItem) =>
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
  }
  return { ...session, items: [...session.items, item] };
}

function updateItemInSession(
  session: SessionState,
  id: string,
  updater: (item: SessionItem) => SessionItem
): SessionState {
  const found = session.items.some((i) => i.id === id);
  if (found) {
    return { ...session, items: updateItemById(session.items, id, updater) };
  }
  // Search in agent items
  return {
    ...session,
    items: session.items.map((item) => {
      if (item.type === "agent") {
        const foundInAgent = item.data.items.some((i) => i.id === id);
        if (foundInAgent) {
          return {
            ...item,
            data: {
              ...item.data,
              items: updateItemById(item.data.items, id, updater),
            },
          };
        }
      }
      return item;
    }),
  };
}

function updateSessions(
  sessions: SessionState[],
  currentSession: SessionState
): SessionState[] {
  return [...sessions.slice(0, -1), currentSession];
}

// --- Text Accumulation ---

export function handleTextDelta(
  ctx: LoopContext,
  message: TextDelta
): Partial<LoopContext> {
  // Flush thinking buffer before text
  const thinkingFlush = ctx.thinkingBuffer !== "" ? flushThinkingBuffer() : {};

  const newBuffer = ctx.textBuffer + message.text;
  const promiseComplete =
    ctx.promiseComplete || PROMISE_COMPLETE_REGEX.test(newBuffer);

  let session = ctx.currentSession;
  if (!session) {
    return { ...thinkingFlush, textBuffer: newBuffer, promiseComplete };
  }

  session = { ...session, activity: "responding" };

  let accumulatedTextItemId = ctx.accumulatedTextItemId;
  if (accumulatedTextItemId) {
    session = updateItemInSession(session, accumulatedTextItemId, () => ({
      type: "text_delta",
      id: accumulatedTextItemId!,
      data: {
        type: "text_delta",
        text: newBuffer,
        timestamp: message.timestamp,
      },
    }));
  } else {
    accumulatedTextItemId = generateItemId(ctx);
    const item: SessionItem = {
      type: "text_delta",
      id: accumulatedTextItemId,
      data: {
        type: "text_delta",
        text: newBuffer,
        timestamp: message.timestamp,
      },
    };
    session = addItemToSession(session, item, getCurrentAgentId(ctx));
  }

  return {
    ...thinkingFlush,
    textBuffer: newBuffer,
    accumulatedTextItemId,
    promiseComplete,
    currentSession: session,
    sessions: updateSessions(ctx.sessions, session),
    itemIdCounter: ctx.accumulatedTextItemId
      ? ctx.itemIdCounter
      : ctx.itemIdCounter + 1,
  };
}

// --- Thinking Accumulation ---

export function handleThinkingDelta(
  ctx: LoopContext,
  message: ThinkingDelta
): Partial<LoopContext> {
  // Flush text buffer before thinking
  const textFlush = ctx.textBuffer !== "" ? flushTextBuffer() : {};

  const newBuffer = ctx.thinkingBuffer + message.text;

  let session = ctx.currentSession;
  if (!session) {
    return { ...textFlush, thinkingBuffer: newBuffer };
  }

  session = { ...session, activity: "thinking" };

  let accumulatedThinkingItemId = ctx.accumulatedThinkingItemId;
  if (accumulatedThinkingItemId) {
    session = updateItemInSession(session, accumulatedThinkingItemId, () => ({
      type: "thinking_delta",
      id: accumulatedThinkingItemId!,
      data: {
        type: "thinking_delta",
        text: newBuffer,
        timestamp: message.timestamp,
      },
    }));
  } else {
    accumulatedThinkingItemId = generateItemId(ctx);
    const item: SessionItem = {
      type: "thinking_delta",
      id: accumulatedThinkingItemId,
      data: {
        type: "thinking_delta",
        text: newBuffer,
        timestamp: message.timestamp,
      },
    };
    session = addItemToSession(session, item, getCurrentAgentId(ctx));
  }

  return {
    ...textFlush,
    thinkingBuffer: newBuffer,
    accumulatedThinkingItemId,
    currentSession: session,
    sessions: updateSessions(ctx.sessions, session),
    itemIdCounter: ctx.accumulatedThinkingItemId
      ? ctx.itemIdCounter
      : ctx.itemIdCounter + 1,
  };
}

// --- Tool Processing (split into helpers to reduce complexity) ---

function isTaskTool(name: string): boolean {
  return name.toLowerCase() === "task";
}

function extractResultText(
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

interface ToolProcessState {
  session: SessionState;
  activeAgentStack: string[];
}

function processToolUseBlock(
  state: ToolProcessState,
  block: ToolUseBlock
): ToolProcessState {
  let { session, activeAgentStack: stack } = state;

  if (isTaskTool(block.name)) {
    const existing = session.items.find((i) => i.id === block.id);
    if (existing) {
      session = updateItemInSession(session, block.id, (item) =>
        item.type === "agent"
          ? {
              ...item,
              data: { ...item.data, status: block.status ?? item.data.status },
            }
          : item
      );
    } else {
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
      const agentId = stack.length > 0 ? (stack.at(-1) ?? null) : null;
      session = addItemToSession(
        session,
        { type: "agent", id: block.id, data: agentBlock },
        agentId
      );
      stack = [...stack, block.id];
    }
  } else {
    const existing = session.items.find((i) => i.id === block.id);
    if (existing) {
      session = updateItemInSession(session, block.id, (item) =>
        item.type === "tool"
          ? {
              ...item,
              data: { ...item.data, status: block.status ?? item.data.status },
            }
          : item
      );
    } else {
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
      const agentId = stack.length > 0 ? (stack.at(-1) ?? null) : null;
      session = addItemToSession(
        session,
        { type: "tool", id: block.id, data: toolBlock },
        agentId
      );
    }
  }

  return { session, activeAgentStack: stack };
}

function processToolResultBlock(
  state: ToolProcessState,
  block: ToolResultBlock
): ToolProcessState {
  let { session, activeAgentStack: stack } = state;

  const agentBlock = findAgentById(session.items, block.tool_use_id);
  if (agentBlock) {
    session = updateItemInSession(session, block.tool_use_id, (item) =>
      item.type === "agent"
        ? {
            ...item,
            data: {
              ...item.data,
              status: block.is_error ? "failed" : "completed",
              endTime: Date.now(),
            },
          }
        : item
    );
    const stackIndex = stack.indexOf(block.tool_use_id);
    if (stackIndex >= 0) {
      stack = [...stack.slice(0, stackIndex), ...stack.slice(stackIndex + 1)];
    }
    return { session, activeAgentStack: stack };
  }

  const existingTool = findToolById(session.items, block.tool_use_id);
  let foundInAgent = false;
  if (!existingTool) {
    for (const item of session.items) {
      if (
        item.type === "agent" &&
        findToolById(item.data.items, block.tool_use_id)
      ) {
        foundInAgent = true;
        break;
      }
    }
  }

  if (existingTool || foundInAgent) {
    session = updateItemInSession(session, block.tool_use_id, (item) => {
      if (item.type !== "tool") {
        return item;
      }
      const existing = item.data;
      const content: ToolCallContent[] = existing.content ?? [];
      const text = extractResultText(block.content);
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

  return { session, activeAgentStack: stack };
}

function processTerminalBlocks(
  session: SessionState,
  terminalBlocks: import("#parsers/message-types").TerminalBlock[]
): SessionState {
  for (const block of terminalBlocks) {
    for (const item of session.items) {
      if (
        item.type === "tool" &&
        (item.data.status === "in_progress" || item.data.status === "pending")
      ) {
        session = updateItemInSession(session, item.id, (i) => {
          if (i.type !== "tool") {
            return i;
          }
          const content: ToolCallContent[] = i.data.content ?? [];
          content.push({ type: "terminal", terminalId: block.terminalId });
          return { ...i, data: { ...i.data, content } };
        });
        break;
      }
    }
  }
  return session;
}

function processToolBlocks(
  ctx: LoopContext,
  session: SessionState,
  toolUseBlocks: ToolUseBlock[],
  toolResultBlocks: ToolResultBlock[],
  terminalBlocks: import("#parsers/message-types").TerminalBlock[]
): { session: SessionState; activeAgentStack: string[] } {
  let state: ToolProcessState = {
    session,
    activeAgentStack: [...ctx.activeAgentStack],
  };

  for (const block of toolUseBlocks) {
    state = processToolUseBlock(state, block);
  }

  for (const block of toolResultBlocks) {
    state = processToolResultBlock(state, block);
  }

  state.session = processTerminalBlocks(state.session, terminalBlocks);

  return state;
}

// --- Usage Tracking ---

function updateSessionUsage(
  session: SessionState,
  message: RichMessage
): SessionState {
  const usage = { ...session.usage };

  if (isMessage(message)) {
    const toolCalls = message.content.filter(isToolUseBlock);
    if (toolCalls.length > 0) {
      usage.toolCallCount += toolCalls.length;
    }
  }

  if (isResultMessage(message)) {
    if (message.usage) {
      usage.inputTokens = message.usage.input_tokens;
      usage.outputTokens = message.usage.output_tokens;
    }
    if (message.total_cost_usd !== undefined) {
      usage.cost = message.total_cost_usd;
    }
  }

  return { ...session, usage };
}

// --- Main Message Handler ---

export function processMessage(
  ctx: LoopContext,
  message: RichMessage
): Partial<LoopContext> {
  if (isThinkingDelta(message)) {
    return handleThinkingDelta(ctx, message);
  }

  if (message.type === "text_delta") {
    return handleTextDelta(ctx, message as TextDelta);
  }

  if (isPlanMessage(message)) {
    return handlePlanMessage(ctx, message);
  }

  if (isMessage(message)) {
    return handleContentMessage(ctx, message);
  }

  return handleOtherMessage(ctx, message);
}

function handlePlanMessage(
  ctx: LoopContext,
  message: PlanMessage
): Partial<LoopContext> {
  if (!ctx.currentSession) {
    return {};
  }
  const session = { ...ctx.currentSession, plan: message.entries };
  return {
    currentSession: session,
    sessions: updateSessions(ctx.sessions, session),
  };
}

function handleContentMessage(
  ctx: LoopContext,
  message: Message
): Partial<LoopContext> {
  const toolUseBlocks = message.content.filter(isToolUseBlock);
  const toolResultBlocks = message.content.filter(isToolResultBlock);
  const terminalBlocks = message.content.filter(isTerminalBlock);

  let session = ctx.currentSession;
  if (!session) {
    return {};
  }

  // Flush buffers
  const flushUpdates = {
    ...(ctx.textBuffer !== "" ? flushTextBuffer() : {}),
    ...(ctx.thinkingBuffer !== "" ? flushThinkingBuffer() : {}),
  };

  // Update activity for tool execution
  if (toolUseBlocks.length > 0) {
    session = { ...session, activity: "tool_executing" };
  }

  // Filter tool blocks from message content
  const isToolRelated = (b: ContentBlock) =>
    isToolUseBlock(b) || isToolResultBlock(b) || isTerminalBlock(b);
  const nonToolContent = message.content.filter((b) => !isToolRelated(b));

  let itemIdCounter = ctx.itemIdCounter;

  // Add message if non-tool content exists
  if (nonToolContent.length > 0) {
    const filteredMessage: Message = { ...message, content: nonToolContent };
    const itemId = `item-${Date.now()}-${itemIdCounter++}`;
    const item: SessionItem = {
      type: "message",
      id: itemId,
      data: filteredMessage,
    };
    session = addItemToSession(session, item, getCurrentAgentId(ctx));
  }

  // Process tool blocks
  let activeAgentStack = ctx.activeAgentStack;
  if (toolUseBlocks.length > 0 || toolResultBlocks.length > 0) {
    const result = processToolBlocks(
      { ...ctx, activeAgentStack },
      session,
      toolUseBlocks,
      toolResultBlocks,
      terminalBlocks
    );
    session = result.session;
    activeAgentStack = result.activeAgentStack;
  }

  // Update usage
  session = updateSessionUsage(session, message);

  return {
    ...flushUpdates,
    currentSession: session,
    sessions: updateSessions(ctx.sessions, session),
    activeAgentStack,
    itemIdCounter,
  };
}

function handleOtherMessage(
  ctx: LoopContext,
  message: RichMessage
): Partial<LoopContext> {
  let session = ctx.currentSession;
  if (!session) {
    return {};
  }

  const flushUpdates = {
    ...(ctx.textBuffer !== "" ? flushTextBuffer() : {}),
    ...(ctx.thinkingBuffer !== "" ? flushThinkingBuffer() : {}),
  };

  let itemIdCounter = ctx.itemIdCounter;
  const itemId = `item-${Date.now()}-${itemIdCounter++}`;

  let item: SessionItem;
  if (message.type === "system") {
    item = {
      type: "system",
      id: itemId,
      data: message as import("#parsers/message-types").SystemMessage,
    };
  } else if (message.type === "result") {
    const resultMsg = message as ResultMessage;
    let promiseComplete = ctx.promiseComplete;
    if (resultMsg.result && PROMISE_COMPLETE_REGEX.test(resultMsg.result)) {
      promiseComplete = true;
    }
    item = { type: "result", id: itemId, data: resultMsg };

    session = updateSessionUsage(session, message);
    session = addItemToSession(session, item, getCurrentAgentId(ctx));

    return {
      ...flushUpdates,
      promiseComplete,
      currentSession: session,
      sessions: updateSessions(ctx.sessions, session),
      itemIdCounter,
    };
  } else {
    return flushUpdates;
  }

  session = updateSessionUsage(session, message);
  session = addItemToSession(session, item, getCurrentAgentId(ctx));

  return {
    ...flushUpdates,
    currentSession: session,
    sessions: updateSessions(ctx.sessions, session),
    itemIdCounter,
  };
}

// --- Session Lifecycle ---

export function initSession(ctx: LoopContext): Partial<LoopContext> {
  const session: SessionState = {
    id: `acp-${Date.now()}`,
    iteration: ctx.iteration,
    cwd: ctx.options.cwd ?? process.cwd(),
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

  return {
    currentSession: session,
    sessions: [...ctx.sessions, session],
    textBuffer: "",
    thinkingBuffer: "",
    accumulatedTextItemId: null,
    accumulatedThinkingItemId: null,
    promiseComplete: false,
  };
}

export function completeSession(ctx: LoopContext): Partial<LoopContext> {
  if (!ctx.currentSession) {
    return {};
  }

  const completedSession: SessionState = {
    ...ctx.currentSession,
    status: "complete",
    endTime: Date.now(),
  };

  return {
    currentSession: null,
    sessions: updateSessions(ctx.sessions, completedSession),
    textBuffer: "",
    thinkingBuffer: "",
    accumulatedTextItemId: null,
    accumulatedThinkingItemId: null,
  };
}

export function computeTotals(sessions: SessionState[]) {
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
