/**
 * Message List Tests
 *
 * Tests for message type detection logic used in MessageList.
 */

import { describe, expect, test } from "bun:test";
import type {
  Message,
  PartialToolInput,
  ResultMessage,
  RichMessage,
  TextDelta,
} from "#parsers/message-types";
import {
  isMessage,
  isPartialToolInput,
  isResultMessage,
  isTextDelta,
} from "#parsers/message-types";

describe("message type detection", () => {
  const mockMessage: Message = {
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "Hello" }],
  };

  const mockResultMessage: ResultMessage = {
    type: "result",
    subtype: "success",
    complete: true,
    timestamp: Date.now(),
  };

  const mockPartialToolInput: PartialToolInput = {
    type: "partial_tool_input",
    index: 0,
    partialInput: { key: "value" },
    timestamp: Date.now(),
  };

  const mockTextDelta: TextDelta = {
    type: "text_delta",
    text: "Hello",
    timestamp: Date.now(),
  };

  test("isMessage detects Message type", () => {
    expect(isMessage(mockMessage)).toBe(true);
    expect(isMessage(mockResultMessage)).toBe(false);
    expect(isMessage(mockPartialToolInput)).toBe(false);
    expect(isMessage(mockTextDelta)).toBe(false);
  });

  test("isResultMessage detects ResultMessage type", () => {
    expect(isResultMessage(mockResultMessage)).toBe(true);
    expect(isResultMessage(mockMessage)).toBe(false);
    expect(isResultMessage(mockPartialToolInput)).toBe(false);
    expect(isResultMessage(mockTextDelta)).toBe(false);
  });

  test("isPartialToolInput detects PartialToolInput type", () => {
    expect(isPartialToolInput(mockPartialToolInput)).toBe(true);
    expect(isPartialToolInput(mockMessage)).toBe(false);
    expect(isPartialToolInput(mockResultMessage)).toBe(false);
    expect(isPartialToolInput(mockTextDelta)).toBe(false);
  });

  test("isTextDelta detects TextDelta type", () => {
    expect(isTextDelta(mockTextDelta)).toBe(true);
    expect(isTextDelta(mockMessage)).toBe(false);
    expect(isTextDelta(mockResultMessage)).toBe(false);
    expect(isTextDelta(mockPartialToolInput)).toBe(false);
  });
});

describe("message content filtering", () => {
  test("filters messages by type", () => {
    const messages: RichMessage[] = [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "First" }],
      },
      {
        type: "result",
        subtype: "success",
        complete: true,
        timestamp: Date.now(),
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Second" }],
      },
    ];

    const onlyMessages = messages.filter(isMessage);
    expect(onlyMessages).toHaveLength(2);

    const onlyResults = messages.filter(isResultMessage);
    expect(onlyResults).toHaveLength(1);
  });
});
