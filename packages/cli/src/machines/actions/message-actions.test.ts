import { describe, expect, test } from "bun:test";
import type { Message, SessionState, ToolBlock } from "#parsers/message-types";
import type { LoopContext } from "../types";
import { processMessage } from "./message-actions";

function createSession(items: SessionState["items"] = []): SessionState {
  return {
    id: "test-session",
    iteration: 0,
    cwd: "/test",
    mcpServers: [],
    availableCommands: [],
    items,
    usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
    todos: [],
    startTime: Date.now(),
    collapsed: false,
    status: "running",
    activity: "idle",
  };
}

function createCtx(session: SessionState): LoopContext {
  return {
    sessions: [session],
    currentSession: session,
    iteration: 0,
    promiseComplete: false,
    textBuffer: "",
    thinkingBuffer: "",
    accumulatedTextItemId: null,
    accumulatedThinkingItemId: null,
    pendingPermissions: new Map(),
    currentPermissionId: null,
    messageCount: 0,
    activeAgentStack: [],
    itemIdCounter: 0,
    adapter: {} as any,
    options: { prompt: "", cwd: "/test" } as any,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    toolCallCount: 0,
    prdItems: [],
  };
}

describe("processMessage – tool update merges rawInput", () => {
  test("initial tool_use creates tool with rawInput", () => {
    const session = createSession();
    const ctx = createCtx(session);
    const msg: Message = {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tc-1",
          name: "Bash",
          input: { command: "ls -la", description: "List files" },
          kind: "execute",
          status: "pending",
        },
      ],
      timestamp: Date.now(),
    };

    const result = processMessage(ctx, msg);
    const updated = result.currentSession!;
    const item = updated.items.find((i) => i.id === "tc-1");
    expect(item).toBeDefined();
    expect(item!.type).toBe("tool");
    const data = (item as { type: "tool"; id: string; data: ToolBlock }).data;
    expect(data.rawInput).toEqual({
      command: "ls -la",
      description: "List files",
    });
    expect(data.kind).toBe("execute");
  });

  test("subsequent tool_use update merges rawInput into existing tool", () => {
    const existingTool: ToolBlock = {
      type: "tool",
      toolCallId: "tc-1",
      title: "Bash",
      status: "pending",
    };
    const session = createSession([
      { type: "tool", id: "tc-1", data: existingTool },
    ]);
    const ctx = createCtx(session);

    const msg: Message = {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tc-1",
          name: "Bash",
          input: { command: "ls -la", description: "List files" },
          resolvedName: "Bash",
          kind: "execute",
          status: "in_progress",
        },
      ],
      timestamp: Date.now(),
    };

    const result = processMessage(ctx, msg);
    const updated = result.currentSession!;
    const item = updated.items.find((i) => i.id === "tc-1");
    expect(item!.type).toBe("tool");
    const data = (item as { type: "tool"; id: string; data: ToolBlock }).data;
    expect(data.rawInput).toEqual({
      command: "ls -la",
      description: "List files",
    });
    expect(data.resolvedName).toBe("Bash");
    expect(data.kind).toBe("execute");
    expect(data.status).toBe("in_progress");
  });

  test("update with empty input preserves existing rawInput", () => {
    const existingTool: ToolBlock = {
      type: "tool",
      toolCallId: "tc-1",
      title: "Bash",
      status: "pending",
      rawInput: { command: "ls" },
    };
    const session = createSession([
      { type: "tool", id: "tc-1", data: existingTool },
    ]);
    const ctx = createCtx(session);

    const msg: Message = {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tc-1",
          name: "Bash",
          input: {},
          status: "completed",
        },
      ],
      timestamp: Date.now(),
    };

    const result = processMessage(ctx, msg);
    const updated = result.currentSession!;
    const item = updated.items.find((i) => i.id === "tc-1");
    const data = (item as { type: "tool"; id: string; data: ToolBlock }).data;
    expect(data.rawInput).toEqual({ command: "ls" });
    expect(data.status).toBe("completed");
  });
});

describe("processMessage – nested tool lookup in agent blocks", () => {
  test("finds and updates tool nested inside agent block", () => {
    const nestedTool: ToolBlock = {
      type: "tool",
      toolCallId: "tc-nested",
      title: "Read",
      status: "pending",
    };
    const session = createSession([
      {
        type: "agent",
        id: "agent-1",
        data: {
          type: "agent",
          toolCallId: "agent-1",
          title: "Agent",
          status: "in_progress",
          items: [{ type: "tool", id: "tc-nested", data: nestedTool }],
          startTime: Date.now(),
          collapsed: true,
        },
      },
    ]);
    const ctx = createCtx(session);
    // Put agent on the stack so tool updates target it
    ctx.activeAgentStack = ["agent-1"];

    const msg: Message = {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tc-nested",
          name: "Read",
          input: { file_path: "/src/index.ts" },
          resolvedName: "Read",
          kind: "read",
          status: "in_progress",
        },
      ],
      timestamp: Date.now(),
    };

    const result = processMessage(ctx, msg);
    const updated = result.currentSession!;
    const agent = updated.items.find((i) => i.id === "agent-1");
    expect(agent!.type).toBe("agent");
    const agentData = (
      agent as {
        type: "agent";
        id: string;
        data: import("#parsers/message-types").AgentBlock;
      }
    ).data;
    const tool = agentData.items.find((i) => i.id === "tc-nested");
    expect(tool!.type).toBe("tool");
    const toolData = (tool as { type: "tool"; id: string; data: ToolBlock })
      .data;
    expect(toolData.rawInput).toEqual({ file_path: "/src/index.ts" });
    expect(toolData.kind).toBe("read");
    expect(toolData.status).toBe("in_progress");
  });
});
