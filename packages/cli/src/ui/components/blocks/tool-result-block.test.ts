/**
 * Tool Result Block Tests
 *
 * Tests for helper functions in tool-result-block.tsx.
 * Validates result text extraction and line count detection.
 */

import { describe, expect, test } from "bun:test";

// Claude format: "    1→content"
const CLAUDE_READ_PATTERN = /^\s*\d+→/;
// OpenCode format: "<file>..." with "(End of file - total X lines)" or "(File has more lines..."
const OPENCODE_FILE_PATTERN = /^<file>/;
const OPENCODE_LINES_PATTERN = /total (\d+) lines|beyond line (\d+)/;

// Test helper functions extracted from tool-result-block.tsx
function isClaudeReadResult(text: string): boolean {
  return CLAUDE_READ_PATTERN.test(text);
}

function isOpenCodeReadResult(text: string): boolean {
  return OPENCODE_FILE_PATTERN.test(text);
}

function claudeLineCount(text: string): number {
  const lines = text
    .split("\n")
    .filter((line) => CLAUDE_READ_PATTERN.test(line));
  return lines.length;
}

function openCodeLineCount(text: string): number {
  const match = OPENCODE_LINES_PATTERN.exec(text);
  if (match) {
    return Number.parseInt(match[1] || match[2] || "0", 10);
  }
  // Fallback: count lines between <file> and </file>
  const lines = text
    .split("\n")
    .filter((l) => l.trim() && l !== "<file>" && l !== "</file>");
  return lines.length;
}

function resultText(
  content: string | Array<{ type: string; text?: string }>
): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("");
  }
  return "";
}

function summary(text: string): string {
  if (isClaudeReadResult(text)) {
    const count = claudeLineCount(text);
    return `Read ${count} line${count !== 1 ? "s" : ""}`;
  }
  if (isOpenCodeReadResult(text)) {
    const count = openCodeLineCount(text);
    return `Read ${count} line${count !== 1 ? "s" : ""}`;
  }
  const firstLine = text.split("\n")[0] || "";
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
}

describe("isClaudeReadResult", () => {
  test("detects Claude format with line numbers", () => {
    expect(isClaudeReadResult("    1→const x = 1;")).toBe(true);
    expect(isClaudeReadResult("  123→export function foo()")).toBe(true);
  });

  test("rejects non-Claude formats", () => {
    expect(isClaudeReadResult("const x = 1;")).toBe(false);
    expect(isClaudeReadResult("<file>content</file>")).toBe(false);
    expect(isClaudeReadResult("")).toBe(false);
  });
});

describe("isOpenCodeReadResult", () => {
  test("detects OpenCode format with file tag", () => {
    expect(isOpenCodeReadResult("<file>content</file>")).toBe(true);
    expect(isOpenCodeReadResult("<file>\nline1\nline2\n</file>")).toBe(true);
  });

  test("rejects non-OpenCode formats", () => {
    expect(isOpenCodeReadResult("const x = 1;")).toBe(false);
    expect(isOpenCodeReadResult("    1→content")).toBe(false);
    expect(isOpenCodeReadResult("")).toBe(false);
  });
});

describe("claudeLineCount", () => {
  test("counts lines with Claude format", () => {
    const text = "    1→line1\n    2→line2\n    3→line3";
    expect(claudeLineCount(text)).toBe(3);
  });

  test("handles single line", () => {
    expect(claudeLineCount("    1→only line")).toBe(1);
  });

  test("ignores non-numbered lines", () => {
    const text = "    1→line1\nsome text\n    2→line2";
    expect(claudeLineCount(text)).toBe(2);
  });

  test("returns 0 for empty text", () => {
    expect(claudeLineCount("")).toBe(0);
    expect(claudeLineCount("no numbered lines")).toBe(0);
  });
});

describe("openCodeLineCount", () => {
  test("extracts count from 'total X lines'", () => {
    const text = "<file>\nline1\nline2\n(End of file - total 100 lines)</file>";
    expect(openCodeLineCount(text)).toBe(100);
  });

  test("extracts count from 'beyond line X'", () => {
    const text = "<file>\nline1\n(File has more lines beyond line 50)</file>";
    expect(openCodeLineCount(text)).toBe(50);
  });

  test("falls back to counting lines", () => {
    const text = "<file>\nline1\nline2\nline3\n</file>";
    expect(openCodeLineCount(text)).toBe(3);
  });

  test("excludes file tags from count", () => {
    const text = "<file>\ncontent\n</file>";
    expect(openCodeLineCount(text)).toBe(1);
  });
});

describe("resultText", () => {
  test("returns string content directly", () => {
    expect(resultText("hello world")).toBe("hello world");
  });

  test("extracts text from array content", () => {
    const content = [
      { type: "text", text: "hello " },
      { type: "text", text: "world" },
    ];
    expect(resultText(content)).toBe("hello world");
  });

  test("filters non-text types", () => {
    const content = [
      { type: "text", text: "hello" },
      { type: "image", text: "should ignore" },
      { type: "text", text: " world" },
    ];
    expect(resultText(content)).toBe("hello world");
  });

  test("handles empty array", () => {
    expect(resultText([])).toBe("");
  });

  test("handles items without text", () => {
    const content = [{ type: "text" }, { type: "text", text: "only" }];
    expect(resultText(content)).toBe("only");
  });
});

describe("summary", () => {
  test("summarizes Claude read result", () => {
    const text = "    1→line1\n    2→line2";
    expect(summary(text)).toBe("Read 2 lines");
  });

  test("summarizes single line Claude read", () => {
    const text = "    1→only line";
    expect(summary(text)).toBe("Read 1 line");
  });

  test("summarizes OpenCode read result", () => {
    const text = "<file>\nline1\nline2\n(End of file - total 50 lines)</file>";
    expect(summary(text)).toBe("Read 50 lines");
  });

  test("returns first line for other content", () => {
    expect(summary("First line\nSecond line")).toBe("First line");
  });

  test("truncates long first lines", () => {
    const longLine = "a".repeat(100);
    const result = summary(longLine);
    expect(result.length).toBe(83); // 80 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  test("handles empty content", () => {
    expect(summary("")).toBe("");
  });
});
