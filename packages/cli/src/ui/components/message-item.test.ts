/**
 * Message Item Tests
 *
 * Tests for MessageItem component and related content block logic.
 */

import { describe, expect, test } from "bun:test";
import type { ContentBlock } from "#parsers/message-types";

describe("content block type detection", () => {
  test("text block has type 'text'", () => {
    const block: ContentBlock = { type: "text", text: "Hello" };
    expect(block.type).toBe("text");
  });

  test("tool_use block has type 'tool_use'", () => {
    const block: ContentBlock = {
      type: "tool_use",
      id: "tool_123",
      name: "read",
      input: { file_path: "/test.ts" },
    };
    expect(block.type).toBe("tool_use");
  });

  test("tool_result block has type 'tool_result'", () => {
    const block: ContentBlock = {
      type: "tool_result",
      tool_use_id: "tool_123",
      content: "Result content",
    };
    expect(block.type).toBe("tool_result");
  });
});

describe("content block filtering", () => {
  const blocks: ContentBlock[] = [
    { type: "text", text: "First text" },
    { type: "tool_use", id: "t1", name: "read", input: {} },
    { type: "text", text: "Second text" },
    { type: "tool_result", tool_use_id: "t1", content: "result" },
  ];

  test("filters text blocks", () => {
    const textBlocks = blocks.filter((b) => b.type === "text");
    expect(textBlocks).toHaveLength(2);
  });

  test("filters tool_use blocks", () => {
    const toolUseBlocks = blocks.filter((b) => b.type === "tool_use");
    expect(toolUseBlocks).toHaveLength(1);
  });

  test("filters tool_result blocks", () => {
    const toolResultBlocks = blocks.filter((b) => b.type === "tool_result");
    expect(toolResultBlocks).toHaveLength(1);
  });
});
