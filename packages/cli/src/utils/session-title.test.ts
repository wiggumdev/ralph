import { describe, expect, test } from "bun:test";
import type {
  Message,
  SessionItem,
  SessionState,
  TextDelta,
} from "#parsers/message-types";
import { getSessionTitle } from "./session-title";

const MAX_TITLE_LENGTH = 50;

function createSession(
  status: SessionState["status"],
  items: SessionItem[] = []
): SessionState {
  return {
    id: "test-session",
    iteration: 1,
    cwd: "/test",
    mcpServers: [],
    availableCommands: [],
    items,
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

function messageToItem(message: Message, id: string): SessionItem {
  return { type: "message", id, data: message };
}

function textDeltaToItem(text: string, id: string): SessionItem {
  const delta: TextDelta = { type: "text_delta", text, timestamp: Date.now() };
  return { type: "text_delta", id, data: delta };
}

describe("getSessionTitle", () => {
  test("returns empty string for running session", () => {
    const session = createSession("running", [
      messageToItem(createTextMessage("Some summary text", "assistant"), "1"),
    ]);
    expect(getSessionTitle(session)).toBe("");
  });

  test("returns empty string for paused session", () => {
    const session = createSession("paused", [
      messageToItem(createTextMessage("Some summary text", "assistant"), "1"),
    ]);
    expect(getSessionTitle(session)).toBe("");
  });

  test("returns last assistant message for complete session", () => {
    const session = createSession("complete", [
      messageToItem(createTextMessage("First message", "assistant"), "1"),
      messageToItem(createTextMessage("Final summary", "assistant"), "2"),
    ]);
    expect(getSessionTitle(session)).toBe("Final summary");
  });

  test("returns last assistant message for error session", () => {
    const session = createSession("error", [
      messageToItem(
        createTextMessage("Error occurred during processing", "assistant"),
        "1"
      ),
    ]);
    expect(getSessionTitle(session)).toBe("Error occurred during processing");
  });

  test("ignores user messages", () => {
    const session = createSession("complete", [
      messageToItem(createTextMessage("Assistant response", "assistant"), "1"),
      messageToItem(createTextMessage("User follow-up", "user"), "2"),
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
      messageToItem(createTextMessage(longText, "assistant"), "1"),
    ]);
    const title = getSessionTitle(session);
    expect(title.length).toBe(MAX_TITLE_LENGTH);
    expect(title.endsWith("...")).toBe(true);
  });

  test("extracts first line from multiline text", () => {
    const multilineText = "First line summary\nSecond line details\nThird line";
    const session = createSession("complete", [
      messageToItem(createTextMessage(multilineText, "assistant"), "1"),
    ]);
    expect(getSessionTitle(session)).toBe("First line summary");
  });

  test("extracts title from text_delta items", () => {
    const session = createSession("complete", [
      textDeltaToItem("Streamed response text", "1"),
    ]);
    expect(getSessionTitle(session)).toBe("Streamed response text");
  });

  test("returns last text_delta when multiple exist", () => {
    const session = createSession("complete", [
      textDeltaToItem("First delta", "1"),
      textDeltaToItem("Last delta", "2"),
    ]);
    expect(getSessionTitle(session)).toBe("Last delta");
  });

  test("prefers last text_delta over earlier message item", () => {
    const session = createSession("complete", [
      messageToItem(createTextMessage("Message text", "assistant"), "1"),
      textDeltaToItem("Delta text", "2"),
    ]);
    expect(getSessionTitle(session)).toBe("Delta text");
  });

  test("falls back to message item when text_delta is empty", () => {
    const session = createSession("complete", [
      messageToItem(createTextMessage("Fallback text", "assistant"), "1"),
      textDeltaToItem("", "2"),
    ]);
    expect(getSessionTitle(session)).toBe("Fallback text");
  });
});
