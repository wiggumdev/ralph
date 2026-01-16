import { describe, expect, test } from "bun:test";
import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import {
  formatPermissionName,
  summarizePermissions,
} from "./permission-formatter";

describe("formatPermissionName", () => {
  const makeToolCall = (
    title: string,
    rawInput?: Record<string, unknown>
  ): ToolCallUpdate => ({
    toolCallId: "test-id",
    title,
    rawInput,
    status: "in_progress",
  });

  test("formats Bash with simple command", () => {
    const result = formatPermissionName(
      makeToolCall("Bash(ls)", { command: "ls -la" })
    );
    expect(result).toBe("Bash(ls -la)");
  });

  test("formats Bash with quotes in command", () => {
    const result = formatPermissionName(
      makeToolCall("Bash(echo)", { command: 'echo "hello world"' })
    );
    expect(result).toBe('Bash(echo "hello world")');
  });

  test("formats Bash with newlines/special chars", () => {
    const result = formatPermissionName(
      makeToolCall("Bash(cmd)", { command: "echo 'line1\nline2'" })
    );
    expect(result).toBe("Bash(echo 'line1\nline2')");
  });

  test("formats Bash without command param", () => {
    const result = formatPermissionName(makeToolCall("Bash"));
    expect(result).toBe("Bash");
  });

  test("formats WebFetch with valid URL", () => {
    const result = formatPermissionName(
      makeToolCall("WebFetch(url)", { url: "https://example.com/path" })
    );
    expect(result).toBe("WebFetch(https://example.com/path)");
  });

  test("formats Fetch title variant as WebFetch", () => {
    const result = formatPermissionName(
      makeToolCall("Fetch https://example.com", { url: "https://example.com" })
    );
    expect(result).toBe("WebFetch(https://example.com)");
  });

  test("formats WebFetch without url param", () => {
    const result = formatPermissionName(makeToolCall("WebFetch"));
    expect(result).toBe("WebFetch");
  });

  test("formats WebSearch with query", () => {
    const result = formatPermissionName(
      makeToolCall("WebSearch", { query: "Anthropic Claude AI" })
    );
    expect(result).toBe("WebSearch(Anthropic Claude AI)");
  });

  test("formats WebSearch without query param", () => {
    const result = formatPermissionName(makeToolCall("WebSearch"));
    expect(result).toBe("WebSearch");
  });

  test("formats other tools with just name", () => {
    const result = formatPermissionName(makeToolCall("Read(file.txt)"));
    expect(result).toBe("Read");
  });

  test("handles missing title", () => {
    const result = formatPermissionName({
      toolCallId: "test",
      status: "in_progress",
    } as ToolCallUpdate);
    expect(result).toBe("Unknown");
  });
});

describe("summarizePermissions", () => {
  test("returns empty array for empty input", () => {
    const result = summarizePermissions([]);
    expect(result).toEqual([]);
  });

  test("returns single permission", () => {
    const result = summarizePermissions([
      { formattedName: "Bash(ls)", status: "allowed" },
    ]);
    expect(result).toEqual([
      { formattedName: "Bash(ls)", status: "allowed", count: 1 },
    ]);
  });

  test("dedupes same permissions", () => {
    const result = summarizePermissions([
      { formattedName: "Bash(ls)", status: "allowed" },
      { formattedName: "Bash(ls)", status: "allowed" },
      { formattedName: "Bash(ls)", status: "allowed" },
    ]);
    expect(result).toEqual([
      { formattedName: "Bash(ls)", status: "allowed", count: 3 },
    ]);
  });

  test("separates allowed and denied", () => {
    const result = summarizePermissions([
      { formattedName: "Bash(ls)", status: "allowed" },
      { formattedName: "Bash(ls)", status: "denied" },
    ]);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      formattedName: "Bash(ls)",
      status: "allowed",
      count: 1,
    });
    expect(result).toContainEqual({
      formattedName: "Bash(ls)",
      status: "denied",
      count: 1,
    });
  });

  test("handles mixed permissions", () => {
    const result = summarizePermissions([
      { formattedName: "Bash(ls)", status: "allowed" },
      { formattedName: "Read", status: "allowed" },
      { formattedName: "Bash(ls)", status: "allowed" },
      { formattedName: "WebFetch(https://x.com)", status: "denied" },
    ]);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      formattedName: "Bash(ls)",
      status: "allowed",
      count: 2,
    });
    expect(result).toContainEqual({
      formattedName: "Read",
      status: "allowed",
      count: 1,
    });
    expect(result).toContainEqual({
      formattedName: "WebFetch(https://x.com)",
      status: "denied",
      count: 1,
    });
  });
});
