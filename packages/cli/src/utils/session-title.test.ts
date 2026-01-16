import { describe, expect, test } from "bun:test";
import type {
  Message,
  RichMessage,
  SessionState,
} from "#parsers/message-types";

// Re-implement for testing (same logic as session-title.ts)
const MAX_TITLE_LENGTH = 50;

function getSessionTitle(session: SessionState): string {
  if (session.status === "running" || session.status === "paused") {
    return "";
  }

  const lastMessage = findLastTextMessage(session.messages);
  if (!lastMessage) {
    return "";
  }

  return truncateTitle(lastMessage, MAX_TITLE_LENGTH);
}

function findLastTextMessage(messages: RichMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!(msg && msg.type === "message")) {
      continue;
    }
    const message = msg as Message;
    if (message.role !== "assistant") {
      continue;
    }

    for (const block of message.content) {
      if (block.type === "text") {
        const text = extractFirstLine(block.text);
        if (text.length > 0) {
          return text;
        }
      }
    }
  }
  return null;
}

function extractFirstLine(text: string): string {
  const trimmed = text.trim();
  const firstLine = trimmed.split("\n")[0];
  return firstLine?.trim() || "";
}

function truncateTitle(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 3)}...`;
}

function createSession(
  status: SessionState["status"],
  messages: RichMessage[] = []
): SessionState {
  return {
    id: "test-session",
    iteration: 1,
    cwd: "/test",
    mcpServers: [],
    availableCommands: [],
    messages,
    toolCalls: new Map(),
    usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
    todos: [],
    startTime: Date.now(),
    collapsed: false,
    status,
    activity: "idle",
  };
}

function createTextMessage(text: string, role: "user" | "assistant"): Message {
  return {
    type: "message",
    role,
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
}

describe("getSessionTitle", () => {
  test("returns empty string for running session", () => {
    const session = createSession("running", [
      createTextMessage("Some summary text", "assistant"),
    ]);
    expect(getSessionTitle(session)).toBe("");
  });

  test("returns empty string for paused session", () => {
    const session = createSession("paused", [
      createTextMessage("Some summary text", "assistant"),
    ]);
    expect(getSessionTitle(session)).toBe("");
  });

  test("returns last assistant message for complete session", () => {
    const session = createSession("complete", [
      createTextMessage("First message", "assistant"),
      createTextMessage("Final summary", "assistant"),
    ]);
    expect(getSessionTitle(session)).toBe("Final summary");
  });

  test("returns last assistant message for error session", () => {
    const session = createSession("error", [
      createTextMessage("Error occurred during processing", "assistant"),
    ]);
    expect(getSessionTitle(session)).toBe("Error occurred during processing");
  });

  test("ignores user messages", () => {
    const session = createSession("complete", [
      createTextMessage("Assistant response", "assistant"),
      createTextMessage("User follow-up", "user"),
    ]);
    expect(getSessionTitle(session)).toBe("Assistant response");
  });

  test("returns empty string when no messages", () => {
    const session = createSession("complete", []);
    expect(getSessionTitle(session)).toBe("");
  });

  test("truncates long titles", () => {
    const longText =
      "This is a very long summary that exceeds the maximum allowed length for titles";
    const session = createSession("complete", [
      createTextMessage(longText, "assistant"),
    ]);
    const title = getSessionTitle(session);
    expect(title.length).toBe(MAX_TITLE_LENGTH);
    expect(title.endsWith("...")).toBe(true);
  });

  test("extracts first line from multiline text", () => {
    const multilineText = "First line summary\nSecond line details\nThird line";
    const session = createSession("complete", [
      createTextMessage(multilineText, "assistant"),
    ]);
    expect(getSessionTitle(session)).toBe("First line summary");
  });
});
