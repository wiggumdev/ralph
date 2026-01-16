import { describe, expect, test } from "bun:test";
import type { ToolCallContent } from "@agentclientprotocol/sdk";
import {
  extractToolContentBlocks,
  mapContentChunk,
  mapUpdateToRichMessage,
} from "./message-mapper";

describe("extractToolContentBlocks", () => {
  test("extracts text content as tool_result", () => {
    const content: ToolCallContent[] = [
      { type: "content", content: { type: "text", text: "Hello" } },
      { type: "content", content: { type: "text", text: "World" } },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "tool_result",
      tool_use_id: "tool-1",
      content: "Hello\nWorld",
      is_error: false,
    });
  });

  test("extracts text content with is_error flag", () => {
    const content: ToolCallContent[] = [
      { type: "content", content: { type: "text", text: "Error occurred" } },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", true);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "tool_result",
      is_error: true,
    });
  });

  test("extracts diff content", () => {
    const content: ToolCallContent[] = [
      {
        type: "diff",
        path: "/path/to/file.ts",
        oldText: "old code",
        newText: "new code",
      },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "diff",
      path: "/path/to/file.ts",
      oldText: "old code",
      newText: "new code",
    });
  });

  test("extracts diff without oldText", () => {
    const content: ToolCallContent[] = [
      {
        type: "diff",
        path: "/path/to/new-file.ts",
        newText: "new file content",
      },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "diff",
      path: "/path/to/new-file.ts",
      oldText: undefined,
      newText: "new file content",
    });
  });

  test("extracts terminal content", () => {
    const content: ToolCallContent[] = [
      { type: "terminal", terminalId: "term-123" },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "terminal",
      terminalId: "term-123",
      output: "",
      truncated: false,
      status: "running",
    });
  });

  test("flushes text before non-text content", () => {
    const content: ToolCallContent[] = [
      { type: "content", content: { type: "text", text: "Before" } },
      { type: "terminal", terminalId: "term-1" },
      { type: "content", content: { type: "text", text: "After" } },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ type: "tool_result", content: "Before" });
    expect(blocks[1]).toMatchObject({ type: "terminal" });
    expect(blocks[2]).toMatchObject({ type: "tool_result", content: "After" });
  });

  test("handles image content in tool results", () => {
    const content: ToolCallContent[] = [
      {
        type: "content",
        content: {
          type: "image",
          data: "base64data",
          mimeType: "image/png",
          uri: "file://image.png",
        },
      },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "image",
      data: "base64data",
      mimeType: "image/png",
      uri: "file://image.png",
    });
  });

  test("handles audio content in tool results", () => {
    const content: ToolCallContent[] = [
      {
        type: "content",
        content: {
          type: "audio",
          data: "audiodata",
          mimeType: "audio/mp3",
        },
      },
    ] as ToolCallContent[];

    const blocks = extractToolContentBlocks(content, "tool-1", false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "audio",
      data: "audiodata",
      mimeType: "audio/mp3",
    });
  });

  test("returns empty array for empty content", () => {
    const blocks = extractToolContentBlocks([], "tool-1", false);
    expect(blocks).toHaveLength(0);
  });
});

describe("mapContentChunk", () => {
  const timestamp = 1_234_567_890;

  test("maps text content to text_delta", () => {
    const chunk = {
      content: { type: "text" as const, text: "Hello world" },
    };

    const result = mapContentChunk(chunk as never, timestamp);

    expect(result).toEqual({
      type: "text_delta",
      text: "Hello world",
      timestamp,
    });
  });

  test("maps image content to message with image block", () => {
    const chunk = {
      content: {
        type: "image" as const,
        data: "base64data",
        mimeType: "image/png",
        uri: "file://test.png",
      },
    };

    const result = mapContentChunk(chunk as never, timestamp);

    expect(result).toMatchObject({
      type: "message",
      role: "assistant",
      content: [
        {
          type: "image",
          data: "base64data",
          mimeType: "image/png",
          uri: "file://test.png",
        },
      ],
    });
  });

  test("maps audio content to message with audio block", () => {
    const chunk = {
      content: {
        type: "audio" as const,
        data: "audiodata",
        mimeType: "audio/wav",
      },
    };

    const result = mapContentChunk(chunk as never, timestamp);

    expect(result).toMatchObject({
      type: "message",
      role: "assistant",
      content: [
        {
          type: "audio",
          data: "audiodata",
          mimeType: "audio/wav",
        },
      ],
    });
  });

  test("maps resource_link content", () => {
    const chunk = {
      content: {
        type: "resource_link" as const,
        name: "test.txt",
        uri: "file://test.txt",
        description: "A test file",
        mimeType: "text/plain",
        size: 100,
        title: "Test File",
      },
    };

    const result = mapContentChunk(chunk as never, timestamp);

    expect(result).toMatchObject({
      type: "message",
      content: [
        {
          type: "resource_link",
          name: "test.txt",
          uri: "file://test.txt",
          description: "A test file",
        },
      ],
    });
  });

  test("maps resource with text content", () => {
    const chunk = {
      content: {
        type: "resource" as const,
        resource: {
          uri: "file://test.txt",
          text: "file contents",
          mimeType: "text/plain",
        },
      },
    };

    const result = mapContentChunk(chunk as never, timestamp);

    expect(result).toMatchObject({
      type: "message",
      content: [
        {
          type: "resource",
          resource: {
            type: "text",
            uri: "file://test.txt",
            text: "file contents",
          },
        },
      ],
    });
  });

  test("maps resource with blob content", () => {
    const chunk = {
      content: {
        type: "resource" as const,
        resource: {
          uri: "file://image.png",
          blob: "base64blob",
          mimeType: "image/png",
        },
      },
    };

    const result = mapContentChunk(chunk as never, timestamp);

    expect(result).toMatchObject({
      type: "message",
      content: [
        {
          type: "resource",
          resource: {
            type: "blob",
            uri: "file://image.png",
            blob: "base64blob",
          },
        },
      ],
    });
  });

  test("returns null for unknown content type", () => {
    const chunk = {
      content: { type: "unknown" },
    };

    const result = mapContentChunk(chunk as never, timestamp);
    expect(result).toBeNull();
  });
});

describe("mapUpdateToRichMessage", () => {
  test("maps agent_message_chunk with text", () => {
    const update = {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "Hello" },
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "text_delta",
      text: "Hello",
    });
  });

  test("maps agent_thought_chunk to thinking_delta", () => {
    const update = {
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: "Thinking..." },
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "thinking_delta",
      text: "Thinking...",
    });
  });

  test("maps user_message_chunk with text", () => {
    const update = {
      sessionUpdate: "user_message_chunk",
      content: { type: "text", text: "User input" },
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "message",
      role: "user",
      content: [{ type: "text", text: "User input" }],
    });
  });

  test("returns null for user_message_chunk with non-text content", () => {
    const update = {
      sessionUpdate: "user_message_chunk",
      content: { type: "image", data: "base64" },
    };

    const result = mapUpdateToRichMessage(update as never);
    expect(result).toBeNull();
  });

  test("maps tool_call", () => {
    const update = {
      sessionUpdate: "tool_call",
      toolCallId: "call-123",
      title: "Read",
      rawInput: { path: "/file.txt" },
      kind: "read",
      status: "in_progress",
      locations: [{ path: "/file.txt", line: 10 }],
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "call-123",
          name: "Read",
          input: { path: "/file.txt" },
          kind: "read",
          status: "in_progress",
          locations: [{ path: "/file.txt", line: 10 }],
        },
      ],
    });
  });

  test("maps tool_call with default status", () => {
    const update = {
      sessionUpdate: "tool_call",
      toolCallId: "call-123",
      title: "Bash",
      rawInput: {},
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      content: [
        {
          type: "tool_use",
          status: "pending",
        },
      ],
    });
  });

  test("maps tool_call_update with content", () => {
    const update = {
      sessionUpdate: "tool_call_update",
      toolCallId: "call-123",
      content: [{ type: "content", content: { type: "text", text: "output" } }],
      status: "completed",
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "message",
      content: [
        { type: "tool_result", content: "output" },
        { type: "tool_use", id: "call-123", status: "completed" },
      ],
    });
  });

  test("maps tool_call_update with only status change", () => {
    const update = {
      sessionUpdate: "tool_call_update",
      toolCallId: "call-123",
      status: "completed",
      title: "Done",
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "message",
      content: [
        {
          type: "tool_use",
          id: "call-123",
          status: "completed",
          name: "Done",
        },
      ],
    });
  });

  test("returns null for tool_call_update without content or status", () => {
    const update = {
      sessionUpdate: "tool_call_update",
      toolCallId: "call-123",
    };

    const result = mapUpdateToRichMessage(update as never);
    expect(result).toBeNull();
  });

  test("maps current_mode_update", () => {
    const update = {
      sessionUpdate: "current_mode_update",
      modeId: "plan",
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "system",
      subtype: "mode_change",
    });
  });

  test("maps plan update", () => {
    const update = {
      sessionUpdate: "plan",
      entries: [
        { content: "Task 1", priority: "high", status: "completed" },
        { content: "Task 2", priority: "medium", status: "in_progress" },
      ],
    };

    const result = mapUpdateToRichMessage(update as never);

    expect(result).toMatchObject({
      type: "plan",
      entries: [
        { content: "Task 1", priority: "high", status: "completed" },
        { content: "Task 2", priority: "medium", status: "in_progress" },
      ],
    });
  });

  test("returns null for skipped update types", () => {
    const skippedTypes = [
      "available_commands_update",
      "config_option_update",
      "session_info_update",
    ];

    for (const type of skippedTypes) {
      const update = { sessionUpdate: type };
      const result = mapUpdateToRichMessage(update as never);
      expect(result).toBeNull();
    }
  });

  test("returns null for unknown update types", () => {
    const update = { sessionUpdate: "future_unknown_type" };
    const result = mapUpdateToRichMessage(update as never);
    expect(result).toBeNull();
  });
});
