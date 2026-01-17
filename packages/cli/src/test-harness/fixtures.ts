import type {
  Message,
  MessageRole,
  ResultMessage,
  RichMessage,
  SessionItem,
  SessionState,
  SystemMessage,
  TextDelta,
  TodoItem,
} from "#parsers/message-types";
import type { PermissionRequest } from "#parsers/permission-types";
import type { AppState } from "#providers/state";

// ============================================================================
// Sample Messages
// ============================================================================

export const SAMPLE_TEXT_MESSAGE: Message = {
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: "Analyzing codebase structure..." }],
  timestamp: Date.now(),
};

export const SAMPLE_TOOL_USE_MESSAGE: Message = {
  type: "message",
  role: "assistant",
  content: [
    {
      type: "tool_use",
      id: "toolu_01A",
      name: "Read",
      input: { file_path: "/Users/test/example.ts" },
    },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_TOOL_RESULT_MESSAGE: Message = {
  type: "message",
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "toolu_01A",
      content: 'export function hello() { return "world"; }',
    },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_SYSTEM_MESSAGE: SystemMessage = {
  type: "system",
  subtype: "init",
  session_id: "test_session_abc123",
  model: "claude-sonnet-4-5",
  tools: ["Read", "Write", "Bash", "Edit", "Glob", "Grep"],
  cwd: "/Users/test/project",
  timestamp: Date.now(),
};

export const SAMPLE_RESULT_SUCCESS: ResultMessage = {
  type: "result",
  subtype: "success",
  result: "<promise>COMPLETE</promise>",
  complete: true,
  duration_ms: 12_500,
  total_cost_usd: 0.045,
  usage: { input_tokens: 2500, output_tokens: 1200 },
  timestamp: Date.now(),
};

export const SAMPLE_RESULT_ERROR: ResultMessage = {
  type: "result",
  subtype: "error_during_execution",
  result: "Failed to execute tool",
  complete: false,
  timestamp: Date.now(),
};

export const SAMPLE_TEXT_DELTA: TextDelta = {
  type: "text_delta",
  text: "Analyzing",
  timestamp: Date.now(),
};

// ============================================================================
// Sample Todos
// ============================================================================

export const SAMPLE_TODOS: TodoItem[] = [
  { content: "Analyze codebase structure", status: "completed" },
  { content: "Implement test harness", status: "in_progress" },
  { content: "Add fixture examples", status: "pending" },
];

// ============================================================================
// Helper to create SessionState
// ============================================================================

function createSessionState(
  overrides: Partial<SessionState> & { id: string; iteration: number }
): SessionState {
  return {
    cwd: "/Users/test/project",
    mcpServers: [],
    availableCommands: [],
    items: [],
    usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
    todos: [],
    startTime: Date.now(),
    collapsed: true,
    status: "running",
    activity: "idle",
    ...overrides,
  };
}

// Helper to convert messages to items for backward compatibility
function messagesToItems(messages: RichMessage[]): SessionItem[] {
  return messages.map((msg, index) => {
    const id = `item-${index}`;
    if (msg.type === "message") {
      return { type: "message" as const, id, data: msg as Message };
    }
    if (msg.type === "system") {
      return { type: "system" as const, id, data: msg as SystemMessage };
    }
    if (msg.type === "result") {
      return { type: "result" as const, id, data: msg as ResultMessage };
    }
    if (msg.type === "text_delta") {
      return { type: "text_delta" as const, id, data: msg as TextDelta };
    }
    if (msg.type === "thinking_delta") {
      return {
        type: "thinking_delta" as const,
        id,
        data: msg as import("#parsers/message-types").ThinkingDelta,
      };
    }
    if (msg.type === "plan") {
      return {
        type: "plan" as const,
        id,
        data: msg as import("#parsers/message-types").PlanMessage,
      };
    }
    // Fallback - treat as message
    return { type: "message" as const, id, data: msg as unknown as Message };
  });
}

// ============================================================================
// Sample Sessions
// ============================================================================

export const SAMPLE_SESSION_COMPLETE: SessionState = createSessionState({
  id: "session-1",
  iteration: 1,
  startTime: Date.now() - 60_000,
  endTime: Date.now() - 30_000,
  items: messagesToItems([
    SAMPLE_SYSTEM_MESSAGE,
    SAMPLE_TEXT_MESSAGE,
    SAMPLE_RESULT_SUCCESS,
  ]),
  usage: {
    inputTokens: 2500,
    outputTokens: 1200,
    cost: 0.045,
    toolCallCount: 1,
  },
  collapsed: true,
  status: "complete",
});

export const SAMPLE_SESSION_RUNNING: SessionState = createSessionState({
  id: "session-2",
  iteration: 2,
  startTime: Date.now() - 10_000,
  items: messagesToItems([
    SAMPLE_SYSTEM_MESSAGE,
    SAMPLE_TEXT_MESSAGE,
    SAMPLE_TOOL_USE_MESSAGE,
    SAMPLE_TOOL_RESULT_MESSAGE,
  ]),
  usage: {
    inputTokens: 1500,
    outputTokens: 800,
    cost: 0.023,
    toolCallCount: 2,
  },
  todos: SAMPLE_TODOS,
  collapsed: false,
  status: "running",
});

// ============================================================================
// Complete Scenarios
// ============================================================================

export const SCENARIO_IDLE: AppState = {
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

export const SCENARIO_RUNNING: AppState = {
  sessions: [SAMPLE_SESSION_COMPLETE, SAMPLE_SESSION_RUNNING],
  status: "running",
  iteration: 2,
  totalInputTokens: 4000,
  totalOutputTokens: 2000,
  totalCost: 0.068,
  toolCallCount: 3,
  prdItems: [],
  permissionRequest: null,
};

export const SCENARIO_COMPLETE: AppState = {
  sessions: [
    SAMPLE_SESSION_COMPLETE,
    createSessionState({
      id: "session-2",
      iteration: 2,
      endTime: Date.now() - 20_000,
      items: messagesToItems([
        SAMPLE_SYSTEM_MESSAGE,
        SAMPLE_TEXT_MESSAGE,
        SAMPLE_RESULT_SUCCESS,
      ]),
      usage: {
        inputTokens: 2500,
        outputTokens: 1200,
        cost: 0.045,
        toolCallCount: 2,
      },
      status: "complete",
    }),
    createSessionState({
      id: "session-3",
      iteration: 3,
      endTime: Date.now(),
      items: messagesToItems([
        SAMPLE_SYSTEM_MESSAGE,
        SAMPLE_TEXT_MESSAGE,
        {
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Task completed successfully." }],
          timestamp: Date.now(),
        },
        SAMPLE_RESULT_SUCCESS,
      ]),
      usage: {
        inputTokens: 2500,
        outputTokens: 1200,
        cost: 0.045,
        toolCallCount: 2,
      },
      todos: [{ content: "All tasks completed", status: "completed" }],
      collapsed: false,
      status: "complete",
    }),
  ],
  status: "complete",
  iteration: 3,
  totalInputTokens: 7500,
  totalOutputTokens: 3600,
  totalCost: 0.135,
  toolCallCount: 5,
  prdItems: [],
  permissionRequest: null,
};

export const SCENARIO_ERROR: AppState = {
  sessions: [
    createSessionState({
      id: "session-1",
      iteration: 1,
      startTime: Date.now() - 5000,
      items: messagesToItems([
        SAMPLE_SYSTEM_MESSAGE,
        SAMPLE_TEXT_MESSAGE,
        SAMPLE_RESULT_ERROR,
      ]),
      usage: {
        inputTokens: 1000,
        outputTokens: 200,
        cost: 0.012,
        toolCallCount: 1,
      },
      collapsed: false,
      status: "error",
    }),
  ],
  status: "error",
  iteration: 1,
  totalInputTokens: 1000,
  totalOutputTokens: 200,
  totalCost: 0.012,
  toolCallCount: 1,
  prdItems: [],
  permissionRequest: null,
};

export const SCENARIO_PAUSED: AppState = {
  sessions: [
    SAMPLE_SESSION_COMPLETE,
    createSessionState({
      id: "session-2",
      iteration: 2,
      items: messagesToItems([
        SAMPLE_SYSTEM_MESSAGE,
        SAMPLE_TEXT_MESSAGE,
        SAMPLE_TOOL_USE_MESSAGE,
      ]),
      usage: {
        inputTokens: 1200,
        outputTokens: 600,
        cost: 0.018,
        toolCallCount: 2,
      },
      todos: [
        { content: "Reading configuration", status: "completed" },
        { content: "Analyzing dependencies", status: "in_progress" },
        { content: "Generate report", status: "pending" },
      ],
      status: "paused",
    }),
  ],
  status: "paused",
  iteration: 2,
  totalInputTokens: 3700,
  totalOutputTokens: 1800,
  totalCost: 0.063,
  toolCallCount: 3,
  prdItems: [],
  permissionRequest: null,
};

// ============================================================================
// Sample Permission Requests
// ============================================================================

export const SAMPLE_PERMISSION_BASH: PermissionRequest = {
  id: "perm-1",
  sessionId: "session-1",
  toolCall: {
    toolCallId: "toolu_bash_1",
    title: "Bash",
    kind: "execute",
    status: "pending",
  },
  options: [
    { optionId: "allow-once", name: "Allow once", kind: "allow_once" },
    { optionId: "allow-always", name: "Allow always", kind: "allow_always" },
    { optionId: "reject-once", name: "Reject", kind: "reject_once" },
    { optionId: "reject-always", name: "Never allow", kind: "reject_always" },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_PERMISSION_EDIT: PermissionRequest = {
  id: "perm-2",
  sessionId: "session-1",
  toolCall: {
    toolCallId: "toolu_edit_1",
    title: "Edit",
    kind: "edit",
    status: "pending",
  },
  options: [
    { optionId: "allow-once", name: "Allow once", kind: "allow_once" },
    { optionId: "allow-always", name: "Allow always", kind: "allow_always" },
    { optionId: "reject-once", name: "Reject", kind: "reject_once" },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_PERMISSION_REQUESTS: PermissionRequest[] = [
  SAMPLE_PERMISSION_BASH,
  SAMPLE_PERMISSION_EDIT,
];

// ============================================================================
// Message Sequences for Playback
// ============================================================================

export const SEQUENCE_SIMPLE_TASK: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "I'll analyze the codebase first." }],
    timestamp: 100,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_read1",
        name: "Glob",
        input: { pattern: "**/*.ts" },
      },
    ],
    timestamp: 200,
  },
  {
    type: "message",
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "toolu_read1",
        content: "src/index.ts\nsrc/utils.ts\nsrc/types.ts",
      },
    ],
    timestamp: 300,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: "Found 3 TypeScript files. Task complete." },
    ],
    timestamp: 400,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 500 },
];

export const SEQUENCE_TOOL_CALLS: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "I'll read the file first." }],
    timestamp: 100,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_read1",
        name: "Read",
        input: { file_path: "/test.ts" },
      },
    ],
    timestamp: 200,
  },
  {
    type: "message",
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "toolu_read1",
        content: "const foo = 'bar';",
      },
    ],
    timestamp: 300,
  },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Now I'll modify it." }],
    timestamp: 400,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_edit1",
        name: "Edit",
        input: {
          file_path: "/test.ts",
          old_string: "const foo = 'bar';",
          new_string: "const foo = 'updated';",
        },
      },
    ],
    timestamp: 500,
  },
  {
    type: "message",
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "toolu_edit1",
        content: "File updated successfully.",
      },
    ],
    timestamp: 600,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 700 },
];

// ============================================================================
// Scenario and Sequence Maps
// ============================================================================

export const SCENARIOS = {
  idle: SCENARIO_IDLE,
  running: SCENARIO_RUNNING,
  complete: SCENARIO_COMPLETE,
  error: SCENARIO_ERROR,
  paused: SCENARIO_PAUSED,
} as const;

export const SEQUENCES = {
  simple_task: SEQUENCE_SIMPLE_TASK,
  tool_calls: SEQUENCE_TOOL_CALLS,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function createMessage(
  text: string,
  role: MessageRole = "assistant"
): Message {
  return {
    type: "message",
    role,
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
}

export function createToolUseMessage(
  toolName: string,
  input: Record<string, unknown>,
  id?: string
): Message {
  return {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: id ?? `toolu_${Date.now()}`,
        name: toolName,
        input,
      },
    ],
    timestamp: Date.now(),
  };
}
