import type {
  Message,
  MessageRole,
  PlanMessage,
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

export const SAMPLE_THINKING_DELTA: import("#parsers/message-types").ThinkingDelta =
  {
    type: "thinking_delta",
    text: "The user is asking me to analyze the codebase...",
    timestamp: Date.now(),
  };

export const SAMPLE_PLAN_MESSAGE: PlanMessage = {
  type: "plan",
  entries: [
    { content: "Run bun install", priority: "high", status: "completed" },
    { content: "Start dev server", priority: "medium", status: "in_progress" },
    { content: "Check git status", priority: "low", status: "pending" },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_TOOL_ERROR: Message = {
  type: "message",
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "toolu_error1",
      content: "Error: File not found: /nonexistent.ts",
      is_error: true,
    },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_BASH_TOOL_USE: Message = {
  type: "message",
  role: "assistant",
  content: [
    {
      type: "tool_use",
      id: "toolu_bash1",
      name: "Bash",
      input: { command: "bun install", description: "Install dependencies" },
      kind: "execute",
      status: "pending",
    },
  ],
  timestamp: Date.now(),
};

export const SAMPLE_BASH_RESULT: Message = {
  type: "message",
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "toolu_bash1",
      content:
        "bun install v1.3.5\nChecked 768 packages (no changes) [31.00ms]",
    },
  ],
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

// Word-by-word streaming text deltas
export const SEQUENCE_STREAMING: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  { type: "text_delta", text: "I'll ", timestamp: 100 },
  { type: "text_delta", text: "analyze ", timestamp: 150 },
  { type: "text_delta", text: "the ", timestamp: 200 },
  { type: "text_delta", text: "codebase ", timestamp: 250 },
  { type: "text_delta", text: "structure ", timestamp: 300 },
  { type: "text_delta", text: "and ", timestamp: 350 },
  { type: "text_delta", text: "identify ", timestamp: 400 },
  { type: "text_delta", text: "key ", timestamp: 450 },
  { type: "text_delta", text: "patterns.", timestamp: 500 },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: "I'll analyze the codebase structure and identify key patterns.",
      },
    ],
    timestamp: 600,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 700 },
];

// Bash command execution flow
export const SEQUENCE_BASH_TOOL: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Installing dependencies..." }],
    timestamp: 100,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_bash1",
        name: "Bash",
        input: { command: "bun install", description: "Install dependencies" },
        kind: "execute",
        status: "pending",
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
        tool_use_id: "toolu_bash1",
        content:
          "bun install v1.3.5\n\nChecked 768 installs across 936 packages (no changes) [31.00ms]",
      },
    ],
    timestamp: 400,
  },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Dependencies installed successfully." }],
    timestamp: 500,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 600 },
];

// Todo/Plan progression flow
export const SEQUENCE_TODO_FLOW: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Creating a task plan..." }],
    timestamp: 100,
  },
  {
    type: "plan",
    entries: [
      { content: "Read config file", priority: "high", status: "pending" },
      { content: "Validate settings", priority: "medium", status: "pending" },
      { content: "Apply changes", priority: "medium", status: "pending" },
    ],
    timestamp: 200,
  },
  {
    type: "plan",
    entries: [
      { content: "Read config file", priority: "high", status: "in_progress" },
      { content: "Validate settings", priority: "medium", status: "pending" },
      { content: "Apply changes", priority: "medium", status: "pending" },
    ],
    timestamp: 300,
  },
  {
    type: "plan",
    entries: [
      { content: "Read config file", priority: "high", status: "completed" },
      {
        content: "Validate settings",
        priority: "medium",
        status: "in_progress",
      },
      { content: "Apply changes", priority: "medium", status: "pending" },
    ],
    timestamp: 400,
  },
  {
    type: "plan",
    entries: [
      { content: "Read config file", priority: "high", status: "completed" },
      { content: "Validate settings", priority: "medium", status: "completed" },
      { content: "Apply changes", priority: "medium", status: "in_progress" },
    ],
    timestamp: 500,
  },
  {
    type: "plan",
    entries: [
      { content: "Read config file", priority: "high", status: "completed" },
      { content: "Validate settings", priority: "medium", status: "completed" },
      { content: "Apply changes", priority: "medium", status: "completed" },
    ],
    timestamp: 600,
  },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "All tasks completed!" }],
    timestamp: 700,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 800 },
];

// Parallel tool calls (2 tools at once)
export const SEQUENCE_PARALLEL: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Reading multiple files in parallel..." }],
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
        input: { file_path: "/src/index.ts" },
      },
      {
        type: "tool_use",
        id: "toolu_read2",
        name: "Read",
        input: { file_path: "/src/utils.ts" },
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
        content: "export function main() { console.log('Hello'); }",
      },
    ],
    timestamp: 300,
  },
  {
    type: "message",
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "toolu_read2",
        content: "export const VERSION = '1.0.0';",
      },
    ],
    timestamp: 350,
  },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Both files read successfully." }],
    timestamp: 400,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 500 },
];

// Tool error and recovery
export const SEQUENCE_TOOL_ERROR: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Attempting to read file..." }],
    timestamp: 100,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_read_fail",
        name: "Read",
        input: { file_path: "/nonexistent.ts" },
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
        tool_use_id: "toolu_read_fail",
        content: "Error: ENOENT: no such file or directory: /nonexistent.ts",
        is_error: true,
      },
    ],
    timestamp: 300,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: "File not found. Trying alternative path..." },
    ],
    timestamp: 400,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_read_ok",
        name: "Read",
        input: { file_path: "/src/index.ts" },
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
        tool_use_id: "toolu_read_ok",
        content: "export function main() { }",
      },
    ],
    timestamp: 600,
  },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Found and read the correct file." }],
    timestamp: 700,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 800 },
];

// Nested agent (Task tool) invocation
export const SEQUENCE_NESTED_AGENT: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: "Spawning a sub-agent to explore the codebase..." },
    ],
    timestamp: 100,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_task1",
        name: "Task",
        input: {
          description: "Explore codebase",
          prompt: "Find all TypeScript files and summarize architecture",
          subagent_type: "Explore",
        },
        kind: "think",
        status: "pending",
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
        tool_use_id: "toolu_task1",
        content:
          "Found 42 TypeScript files. Architecture follows MVC pattern with:\n- /src/models - Data models\n- /src/views - UI components\n- /src/controllers - Business logic",
      },
    ],
    timestamp: 500,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Sub-agent completed exploration. The codebase uses MVC architecture.",
      },
    ],
    timestamp: 600,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 700 },
];

// Thinking blocks streaming before response
export const SEQUENCE_THINKING: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  { type: "thinking_delta", text: "The user ", timestamp: 100 },
  { type: "thinking_delta", text: "is asking ", timestamp: 150 },
  { type: "thinking_delta", text: "me to:\n", timestamp: 200 },
  { type: "thinking_delta", text: "1. Say hello\n", timestamp: 250 },
  { type: "thinking_delta", text: "2. Analyze the codebase\n", timestamp: 300 },
  { type: "thinking_delta", text: "3. Create a summary\n\n", timestamp: 350 },
  {
    type: "thinking_delta",
    text: "I should start with a greeting, ",
    timestamp: 400,
  },
  {
    type: "thinking_delta",
    text: "then provide useful analysis.",
    timestamp: 450,
  },
  { type: "text_delta", text: "Hello! ", timestamp: 550 },
  { type: "text_delta", text: "I'll help you ", timestamp: 600 },
  { type: "text_delta", text: "analyze your codebase.", timestamp: 650 },
  {
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: "Hello! I'll help you analyze your codebase." },
    ],
    timestamp: 700,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 800 },
];

// Edit tool with diff content
export const SEQUENCE_EDIT_WITH_DIFF: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "I'll update the configuration file." }],
    timestamp: 100,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_edit1",
        name: "Edit",
        kind: "edit",
        status: "pending",
        input: {
          file_path: "/src/config.ts",
          old_string: "const DEBUG = false;",
          new_string: 'const DEBUG = process.env.DEBUG === "true";',
        },
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
        tool_use_id: "toolu_edit1",
        content: "File updated: /src/config.ts",
      },
    ],
    timestamp: 400,
  },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Updated the config to use environment variable with fallback.",
      },
    ],
    timestamp: 500,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 600 },
];

// Markdown content with headings, bold, tables, and code
export const SEQUENCE_MARKDOWN_CONTENT: RichMessage[] = [
  { ...SAMPLE_SYSTEM_MESSAGE, timestamp: 0 },
  { type: "text_delta", text: "# Project ", timestamp: 100 },
  { type: "text_delta", text: "Analysis\n\n", timestamp: 150 },
  { type: "text_delta", text: "## Overview\n\n", timestamp: 200 },
  { type: "text_delta", text: "This project uses ", timestamp: 250 },
  { type: "text_delta", text: "**TypeScript** ", timestamp: 300 },
  { type: "text_delta", text: "with **Bun** runtime.\n\n", timestamp: 350 },
  { type: "text_delta", text: "## File Structure\n\n", timestamp: 400 },
  { type: "text_delta", text: "| Directory | Purpose |\n", timestamp: 450 },
  { type: "text_delta", text: "|-----------|----------|\n", timestamp: 500 },
  { type: "text_delta", text: "| `src/` | Source code |\n", timestamp: 550 },
  { type: "text_delta", text: "| `tests/` | Test files |\n", timestamp: 600 },
  {
    type: "text_delta",
    text: "| `docs/` | Documentation |\n\n",
    timestamp: 650,
  },
  { type: "text_delta", text: "## Key Features\n\n", timestamp: 700 },
  { type: "text_delta", text: "- Fast builds with *Bun*\n", timestamp: 750 },
  {
    type: "text_delta",
    text: "- Type-safe with **strict mode**\n",
    timestamp: 800,
  },
  { type: "text_delta", text: "- Modular architecture\n\n", timestamp: 850 },
  { type: "text_delta", text: "### Code Example\n\n", timestamp: 900 },
  { type: "text_delta", text: "```typescript\n", timestamp: 950 },
  {
    type: "text_delta",
    text: "export function add(a: number, b: number) {\n",
    timestamp: 1000,
  },
  { type: "text_delta", text: "  return a + b;\n", timestamp: 1050 },
  { type: "text_delta", text: "}\n```", timestamp: 1100 },
  {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `# Project Analysis

## Overview

This project uses **TypeScript** with **Bun** runtime.

## File Structure

| Directory | Purpose |
|-----------|----------|
| \`src/\` | Source code |
| \`tests/\` | Test files |
| \`docs/\` | Documentation |

## Key Features

- Fast builds with *Bun*
- Type-safe with **strict mode**
- Modular architecture

### Code Example

\`\`\`typescript
export function add(a: number, b: number) {
  return a + b;
}
\`\`\``,
      },
    ],
    timestamp: 1200,
  },
  { ...SAMPLE_RESULT_SUCCESS, timestamp: 1300 },
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
  streaming: SEQUENCE_STREAMING,
  bash_tool: SEQUENCE_BASH_TOOL,
  todo_flow: SEQUENCE_TODO_FLOW,
  parallel: SEQUENCE_PARALLEL,
  tool_error: SEQUENCE_TOOL_ERROR,
  nested_agent: SEQUENCE_NESTED_AGENT,
  thinking: SEQUENCE_THINKING,
  edit_with_diff: SEQUENCE_EDIT_WITH_DIFF,
  markdown_content: SEQUENCE_MARKDOWN_CONTENT,
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
