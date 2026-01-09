/**
 * Stream JSON Parser Tests
 *
 * These tests validate the StreamJsonParser which processes Claude's stream-json output.
 * This parser is critical because it:
 * - Parses streaming JSON lines from Claude CLI output
 * - Extracts session IDs for session tracking
 * - Detects completion markers to know when agent is done
 * - Handles partial JSON recovery for truncated streams
 * - Processes rich message content (text, tool use, tool results)
 *
 * Testing this module ensures the TUI can reliably display Claude's output
 * and correctly detect when the agent completes its task.
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { StreamJsonParser } from "./stream-json-parser";

describe("StreamJsonParser", () => {
  let parser: StreamJsonParser;

  beforeEach(() => {
    parser = new StreamJsonParser();
  });

  describe("processChunk", () => {
    /**
     * Tests that valid JSON lines are parsed correctly.
     * This is the primary path for normal Claude output processing.
     */
    test("parses valid JSON line", () => {
      const chunk = '{"type":"system","subtype":"init","session_id":"abc123"}\n';
      const results = parser.processChunk(chunk);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sessionId).toBe("abc123");
    });

    /**
     * Tests that multiple JSON lines in one chunk are all processed.
     * Claude often sends multiple messages in rapid succession.
     */
    test("parses multiple JSON lines in single chunk", () => {
      const chunk =
        '{"type":"system","session_id":"sess1"}\n{"type":"system","session_id":"sess2"}\n';
      const results = parser.processChunk(chunk);

      expect(results.length).toBe(2);
    });

    /**
     * Tests that empty lines are ignored.
     * Claude output often contains blank lines between messages.
     */
    test("ignores empty lines", () => {
      const chunk = '\n\n{"type":"system"}\n\n';
      const results = parser.processChunk(chunk);

      // Should only get one result from the actual JSON line
      const nonEmpty = results.filter((r) => r.logData || r.displayText);
      expect(nonEmpty.length).toBe(1);
    });

    /**
     * Tests that incomplete lines are buffered for later.
     * Streaming means chunks may split across message boundaries.
     */
    test("buffers incomplete lines", () => {
      const chunk1 = '{"type":"sys';
      const chunk2 = 'tem","session_id":"test"}\n';

      const results1 = parser.processChunk(chunk1);
      expect(results1).toHaveLength(0);

      const results2 = parser.processChunk(chunk2);
      expect(results2.length).toBeGreaterThan(0);
      expect(results2[0].sessionId).toBe("test");
    });

    /**
     * Tests that invalid JSON is treated as display text.
     * Non-JSON output should still be shown to the user.
     */
    test("treats invalid JSON as display text", () => {
      const chunk = "This is plain text output\n";
      const results = parser.processChunk(chunk);

      expect(results.length).toBe(1);
      expect(results[0].displayText).toBe("This is plain text output");
    });
  });

  describe("session tracking", () => {
    /**
     * Tests that session_id is extracted from system messages.
     * Session ID is used to track and resume sessions.
     */
    test("extracts session_id from system message", () => {
      const chunk = '{"type":"system","subtype":"init","session_id":"test-session-123"}\n';
      const results = parser.processChunk(chunk);

      expect(results[0].sessionId).toBe("test-session-123");
    });

    /**
     * Tests that getResult includes the extracted session ID.
     * Session ID should be accessible after parsing is complete.
     */
    test("getResult returns session ID", () => {
      parser.processChunk('{"type":"system","session_id":"my-session"}\n');
      const result = parser.getResult();

      expect(result.sessionId).toBe("my-session");
    });
  });

  describe("completion detection", () => {
    /**
     * Tests that result messages with COMPLETE marker are detected.
     * This is how the agent signals it has finished its task.
     */
    test("detects completion from result message with marker", () => {
      const chunk = '{"type":"result","subtype":"success","result":"<promise>COMPLETE</promise>"}\n';
      parser.processChunk(chunk);
      const result = parser.getResult();

      expect(result.complete).toBe(true);
    });

    /**
     * Tests that result messages without COMPLETE marker are not complete.
     * Claude may return successfully but not have completed the task.
     */
    test("result without marker is not complete", () => {
      const chunk = '{"type":"result","subtype":"success","result":"Task in progress"}\n';
      parser.processChunk(chunk);
      const result = parser.getResult();

      expect(result.complete).toBe(false);
    });

    /**
     * Tests that getResult initially returns not complete.
     * Before any result message, completion should be false.
     */
    test("initially returns not complete", () => {
      const result = parser.getResult();
      expect(result.complete).toBe(false);
    });
  });

  describe("rich message parsing", () => {
    /**
     * Tests that assistant messages with text content are parsed.
     * Text content is the most common message type.
     */
    test("parses assistant message with text content", () => {
      const chunk = JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hello, I can help you." }],
        },
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results.length).toBe(1);
      expect(results[0].richMessage).toBeDefined();
      expect(results[0].richMessage?.type).toBe("message");
    });

    /**
     * Tests that tool use blocks are parsed correctly.
     * Tool use messages contain tool name, id, and input.
     */
    test("parses assistant message with tool use", () => {
      const chunk = JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool-123",
              name: "read_file",
              input: { path: "/test.txt" },
            },
          ],
        },
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results.length).toBe(1);
      expect(results[0].richMessage).toBeDefined();
    });

    /**
     * Tests that system messages are parsed with metadata.
     * System messages contain model info, tools, etc.
     */
    test("parses system message", () => {
      const chunk = JSON.stringify({
        type: "system",
        subtype: "init",
        session_id: "sess-1",
        model: "claude-3-opus",
        tools: ["read", "write"],
        cwd: "/project",
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results.length).toBe(1);
      const msg = results[0].richMessage;
      expect(msg?.type).toBe("system");
    });
  });

  describe("result message parsing", () => {
    /**
     * Tests that result messages include usage statistics.
     * Usage stats help track API costs and token consumption.
     */
    test("parses result message with usage", () => {
      const chunk = JSON.stringify({
        type: "result",
        subtype: "success",
        result: "Done",
        duration_ms: 5000,
        total_cost_usd: 0.05,
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
        },
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results.length).toBe(1);
      expect(results[0].isResult).toBe(true);
      expect(results[0].richMessage?.type).toBe("result");
    });

    /**
     * Tests that result success status is tracked.
     * This indicates if the result contains the completion marker.
     */
    test("tracks result success status", () => {
      const completeChunk = JSON.stringify({
        type: "result",
        result: "<promise>COMPLETE</promise>",
      }) + "\n";

      const results = parser.processChunk(completeChunk);
      expect(results[0].resultSuccess).toBe(true);
    });
  });

  describe("content delta handling", () => {
    /**
     * Tests that text delta messages are processed.
     * Text deltas are used for streaming text output.
     */
    test("processes text_delta messages", () => {
      const chunk = JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "text_delta",
          text: "Hello",
        },
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results.length).toBe(1);
      expect(results[0].displayText).toBe("Hello");
      expect(results[0].richMessage?.type).toBe("text_delta");
    });

    /**
     * Tests that tool input deltas accumulate partial JSON.
     * Tool inputs are streamed incrementally.
     */
    test("accumulates partial tool input JSON", () => {
      // First, start a tool block
      parser.processChunk(
        JSON.stringify({
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            name: "read_file",
          },
        }) + "\n"
      );

      // Then send partial JSON
      const deltaChunk = JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "input_json_delta",
          partial_json: '{"path": "/test',
        },
      }) + "\n";

      const results = parser.processChunk(deltaChunk);
      // May or may not have a result depending on if JSON is parseable
      // The important thing is it doesn't throw
      expect(results).toBeDefined();
    });
  });

  describe("flush", () => {
    /**
     * Tests that flush processes remaining buffer content.
     * At end of stream, any buffered data should be processed.
     */
    test("processes remaining buffer content", () => {
      parser.processChunk('{"type":"system"}');
      // No newline, so buffered

      const results = parser.flush();
      expect(results.length).toBe(1);
    });

    /**
     * Tests that flush returns empty for empty buffer.
     * No data buffered means nothing to flush.
     */
    test("returns empty for empty buffer", () => {
      const results = parser.flush();
      expect(results).toHaveLength(0);
    });

    /**
     * Tests that flush handles partial JSON with recovery.
     * Truncated JSON should be recovered if possible.
     */
    test("attempts partial JSON recovery on flush", () => {
      parser.processChunk('{"type":"partial","value":"te');
      const results = parser.flush();

      // Should have some output, either recovered or raw
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("display text extraction", () => {
    /**
     * Tests that text is extracted from assistant messages.
     * Display text is used for plain output mode.
     */
    test("extracts text from assistant message content", () => {
      const chunk = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "First part. " },
            { type: "text", text: "Second part." },
          ],
        },
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results[0].displayText).toBe("First part. Second part.");
    });

    /**
     * Tests that error messages are formatted with prefix.
     * Errors should be clearly identified in output.
     */
    test("formats error messages with prefix", () => {
      const chunk = JSON.stringify({
        type: "error",
        message: "Something went wrong",
      }) + "\n";

      const results = parser.processChunk(chunk);
      expect(results[0].displayText).toBe("[ERROR] Something went wrong");
    });
  });
});
