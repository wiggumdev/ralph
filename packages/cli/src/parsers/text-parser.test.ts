/**
 * Text Parser Tests
 *
 * These tests validate the TextParser which processes plain text output.
 * This parser is used when:
 * - The CLI adapter doesn't support stream-json format
 * - User prefers simple text output mode
 * - Fallback for non-JSON output streams
 *
 * The parser is simpler than StreamJsonParser but still critical for:
 * - Detecting completion via configurable marker
 * - Splitting output into displayable lines
 * - Maintaining full output for completion checking
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { TextParser } from "./text-parser";

describe("TextParser", () => {
  const DEFAULT_MARKER = "<promise>COMPLETE</promise>";
  let parser: TextParser;

  beforeEach(() => {
    parser = new TextParser(DEFAULT_MARKER);
  });

  describe("processChunk", () => {
    /**
     * Tests that single lines are returned as display text.
     * Basic line processing is the core functionality.
     */
    test("returns single line as display text", () => {
      const results = parser.processChunk("Hello world\n");

      expect(results).toHaveLength(1);
      expect(results[0]!.displayText).toBe("Hello world");
    });

    /**
     * Tests that multiple lines are split correctly.
     * Each line should become a separate parsed chunk.
     */
    test("splits multiple lines into separate chunks", () => {
      const results = parser.processChunk("Line 1\nLine 2\nLine 3\n");

      expect(results).toHaveLength(3);
      expect(results[0]!.displayText).toBe("Line 1");
      expect(results[1]!.displayText).toBe("Line 2");
      expect(results[2]!.displayText).toBe("Line 3");
    });

    /**
     * Tests that empty lines are filtered out.
     * Blank lines shouldn't create empty display entries.
     */
    test("filters empty lines", () => {
      const results = parser.processChunk("Line 1\n\n\nLine 2\n");

      expect(results).toHaveLength(2);
      expect(results[0]!.displayText).toBe("Line 1");
      expect(results[1]!.displayText).toBe("Line 2");
    });

    /**
     * Tests that whitespace-only lines are filtered.
     * Lines with only spaces/tabs are effectively empty.
     */
    test("filters whitespace-only lines", () => {
      const results = parser.processChunk("Content\n   \n\t\nMore content\n");

      expect(results).toHaveLength(2);
      expect(results[0]!.displayText).toBe("Content");
      expect(results[1]!.displayText).toBe("More content");
    });

    /**
     * Tests that lines without trailing newline are processed.
     * Last chunk may not have a trailing newline.
     */
    test("handles chunk without trailing newline", () => {
      const results = parser.processChunk("No newline");

      expect(results).toHaveLength(1);
      expect(results[0]!.displayText).toBe("No newline");
    });

    /**
     * Tests that output accumulates across multiple chunks.
     * Streaming sends output in multiple chunks over time.
     */
    test("accumulates output across chunks", () => {
      parser.processChunk("First chunk\n");
      parser.processChunk("Second chunk\n");
      parser.processChunk("Third chunk\n");

      const result = parser.getResult();
      // Full output should be accumulated (tested via completion)
      expect(result).toBeDefined();
    });
  });

  describe("completion detection", () => {
    /**
     * Tests that completion marker is detected in output.
     * The marker indicates the agent has finished its task.
     */
    test("detects completion marker", () => {
      parser.processChunk("Starting task...\n");
      parser.processChunk("Working...\n");
      parser.processChunk("<promise>COMPLETE</promise>\n");

      const result = parser.getResult();
      expect(result.complete).toBe(true);
    });

    /**
     * Tests that marker is detected even within a line.
     * Marker may appear at end of larger text block.
     */
    test("detects marker within larger text", () => {
      parser.processChunk("Task done. <promise>COMPLETE</promise> Finished.\n");

      const result = parser.getResult();
      expect(result.complete).toBe(true);
    });

    /**
     * Tests that partial markers don't trigger completion.
     * Only the exact marker should count.
     */
    test("does not detect partial marker", () => {
      parser.processChunk("<promise>COMPLE\n");

      const result = parser.getResult();
      expect(result.complete).toBe(false);
    });

    /**
     * Tests that without marker, completion is false.
     * Default state should be not complete.
     */
    test("returns false when marker not present", () => {
      parser.processChunk("Some output without marker\n");
      parser.processChunk("More output\n");

      const result = parser.getResult();
      expect(result.complete).toBe(false);
    });

    /**
     * Tests that initially completion is false.
     * No output means not complete.
     */
    test("initially returns not complete", () => {
      const result = parser.getResult();
      expect(result.complete).toBe(false);
    });

    /**
     * Tests that marker spread across chunks is detected.
     * Streaming may split the marker text across chunks.
     */
    test("detects marker split across chunks", () => {
      parser.processChunk("<promise>COMP");
      parser.processChunk("LETE</promise>\n");

      const result = parser.getResult();
      expect(result.complete).toBe(true);
    });
  });

  describe("custom completion marker", () => {
    /**
     * Tests that custom markers work correctly.
     * Different adapters may use different completion markers.
     */
    test("uses custom completion marker", () => {
      const customParser = new TextParser("TASK_DONE");
      customParser.processChunk("Output...\n");
      customParser.processChunk("TASK_DONE\n");

      const result = customParser.getResult();
      expect(result.complete).toBe(true);
    });

    /**
     * Tests that wrong marker doesn't trigger completion.
     * Parser should only match its configured marker.
     */
    test("does not detect wrong marker", () => {
      const customParser = new TextParser("CUSTOM_MARKER");
      customParser.processChunk("<promise>COMPLETE</promise>\n");

      const result = customParser.getResult();
      expect(result.complete).toBe(false);
    });
  });

  describe("flush", () => {
    /**
     * Tests that flush returns empty array.
     * TextParser doesn't buffer incomplete data like StreamJsonParser.
     */
    test("returns empty array", () => {
      parser.processChunk("Some content");
      const results = parser.flush();

      expect(results).toHaveLength(0);
    });
  });

  describe("getResult", () => {
    /**
     * Tests that getResult structure matches ParserResult interface.
     * Result should always have complete property.
     */
    test("returns ParserResult structure", () => {
      const result = parser.getResult();

      expect(result).toHaveProperty("complete");
      expect(typeof result.complete).toBe("boolean");
    });

    /**
     * Tests that sessionId is not provided by TextParser.
     * Text format doesn't include session tracking.
     */
    test("does not include sessionId", () => {
      parser.processChunk("session_id: 123\n");
      const result = parser.getResult();

      expect(result.sessionId).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    /**
     * Tests that empty string input is handled.
     * Should not crash on empty input.
     */
    test("handles empty string", () => {
      const results = parser.processChunk("");
      expect(results).toHaveLength(0);
    });

    /**
     * Tests that newline-only input is handled.
     * Should filter out empty lines.
     */
    test("handles newline-only input", () => {
      const results = parser.processChunk("\n\n\n");
      expect(results).toHaveLength(0);
    });

    /**
     * Tests that special characters are preserved.
     * Output may contain ANSI codes, unicode, etc.
     */
    test("preserves special characters", () => {
      const results = parser.processChunk("Output: ✓ Success! 🎉\n");

      expect(results).toHaveLength(1);
      expect(results[0]!.displayText).toContain("✓");
      expect(results[0]!.displayText).toContain("🎉");
    });

    /**
     * Tests that very long lines are handled.
     * Output may include large text blocks.
     */
    test("handles very long lines", () => {
      const longLine = "x".repeat(10_000);
      const results = parser.processChunk(`${longLine}\n`);

      expect(results).toHaveLength(1);
      expect(results[0]!.displayText).toBe(longLine);
    });
  });
});
