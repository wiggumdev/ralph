import { describe, expect, test } from "bun:test";
import {
  CLAUDE_READ_PATTERN,
  countReadLines,
  extractReadContent,
  getResultSummary,
  getToolColor,
  getToolColorByKind,
  getToolColorByName,
  getToolIcon,
  getToolIconByKind,
  getToolIconByName,
} from "./tool-block-utils";

describe("getToolIconByKind", () => {
  test("read", () => expect(getToolIconByKind("read")).toBe("→"));
  test("edit", () => expect(getToolIconByKind("edit")).toBe("↔"));
  test("delete", () => expect(getToolIconByKind("delete")).toBe("✗"));
  test("move", () => expect(getToolIconByKind("move")).toBe("⇄"));
  test("search", () => expect(getToolIconByKind("search")).toBe("✱"));
  test("execute", () => expect(getToolIconByKind("execute")).toBe("$"));
  test("think", () => expect(getToolIconByKind("think")).toBe("◇"));
  test("fetch", () => expect(getToolIconByKind("fetch")).toBe("%"));
  test("switch_mode", () => expect(getToolIconByKind("switch_mode")).toBe("↻"));
  test("undefined", () => expect(getToolIconByKind(undefined)).toBe("●"));
});

describe("getToolIconByName", () => {
  test("glob", () => expect(getToolIconByName("glob")).toBe("✱"));
  test("grep", () => expect(getToolIconByName("grep")).toBe("✱"));
  test("read", () => expect(getToolIconByName("read")).toBe("→"));
  test("write", () => expect(getToolIconByName("write")).toBe("←"));
  test("edit", () => expect(getToolIconByName("edit")).toBe("↔"));
  test("bash", () => expect(getToolIconByName("bash")).toBe("$"));
  test("task", () => expect(getToolIconByName("task")).toBe("◇"));
  test("todowrite", () => expect(getToolIconByName("todowrite")).toBe("☐"));
  test("todo_write", () => expect(getToolIconByName("todo_write")).toBe("☐"));
  test("webfetch", () => expect(getToolIconByName("webfetch")).toBe("%"));
  test("askuserquestion", () =>
    expect(getToolIconByName("askuserquestion")).toBe("?"));
  test("unknown", () => expect(getToolIconByName("unknown")).toBe("●"));
  test("case insensitive", () => expect(getToolIconByName("Bash")).toBe("$"));
});

describe("getToolIcon", () => {
  test("uses kind when provided", () => {
    expect(getToolIcon("bash", "read")).toBe("→");
  });

  test("falls back to name when kind is undefined", () => {
    expect(getToolIcon("bash", undefined)).toBe("$");
  });
});

describe("getToolColorByKind", () => {
  test("read", () => expect(getToolColorByKind("read")).toBe("#5c9cf5"));
  test("edit", () => expect(getToolColorByKind("edit")).toBe("#f5a742"));
  test("delete", () => expect(getToolColorByKind("delete")).toBe("#ff6666"));
  test("move", () => expect(getToolColorByKind("move")).toBe("#f5a742"));
  test("search", () => expect(getToolColorByKind("search")).toBe("#9d7cd8"));
  test("execute", () => expect(getToolColorByKind("execute")).toBe("#fab283"));
  test("think", () => expect(getToolColorByKind("think")).toBe("#56b6c2"));
  test("fetch", () => expect(getToolColorByKind("fetch")).toBe("#5c9cf5"));
  test("switch_mode", () =>
    expect(getToolColorByKind("switch_mode")).toBe("#56b6c2"));
  test("undefined", () =>
    expect(getToolColorByKind(undefined)).toBe("#808080"));
});

describe("getToolColorByName", () => {
  test("read", () => expect(getToolColorByName("read")).toBe("#5c9cf5"));
  test("write", () => expect(getToolColorByName("write")).toBe("#7fd88f"));
  test("edit", () => expect(getToolColorByName("edit")).toBe("#f5a742"));
  test("bash", () => expect(getToolColorByName("bash")).toBe("#fab283"));
  test("glob", () => expect(getToolColorByName("glob")).toBe("#9d7cd8"));
  test("grep", () => expect(getToolColorByName("grep")).toBe("#9d7cd8"));
  test("task", () => expect(getToolColorByName("task")).toBe("#56b6c2"));
  test("unknown", () => expect(getToolColorByName("unknown")).toBe("#808080"));
});

describe("getToolColor", () => {
  test("uses kind when provided", () => {
    expect(getToolColor("bash", "read")).toBe("#5c9cf5");
  });

  test("falls back to name when kind is undefined", () => {
    expect(getToolColor("bash", undefined)).toBe("#fab283");
  });
});

describe("CLAUDE_READ_PATTERN", () => {
  test("matches line with arrow", () => {
    expect(CLAUDE_READ_PATTERN.test("    1→content")).toBe(true);
  });

  test("matches line with larger number", () => {
    expect(CLAUDE_READ_PATTERN.test("  10→content")).toBe(true);
  });

  test("does not match plain text", () => {
    expect(CLAUDE_READ_PATTERN.test("no match")).toBe(false);
  });
});

describe("countReadLines", () => {
  test("counts lines matching pattern", () => {
    const text = "    1→first\n    2→second\nnot a line\n    3→third";
    expect(countReadLines(text)).toBe(3);
  });

  test("returns 0 for no matches", () => {
    expect(countReadLines("plain text")).toBe(0);
  });
});

describe("extractReadContent", () => {
  test("extracts content and start line", () => {
    const text = "    5→hello\n    6→world";
    const result = extractReadContent(text);
    expect(result.content).toBe("hello\nworld");
    expect(result.startLine).toBe(5);
  });

  test("returns empty for no matching lines", () => {
    const result = extractReadContent("plain text");
    expect(result.content).toBe("");
    expect(result.startLine).toBe(1);
  });

  test("handles single line", () => {
    const result = extractReadContent("    1→only line");
    expect(result.content).toBe("only line");
    expect(result.startLine).toBe(1);
  });

  test("filters non-matching lines", () => {
    const text = "header\n    1→code\nfooter";
    const result = extractReadContent(text);
    expect(result.content).toBe("code");
    expect(result.startLine).toBe(1);
  });
});

describe("getResultSummary", () => {
  test("returns empty for undefined", () => {
    expect(getResultSummary(undefined)).toBe("");
  });

  test("returns empty for empty array", () => {
    expect(getResultSummary([])).toBe("");
  });

  test("summarizes read content", () => {
    const content = [
      {
        type: "content" as const,
        content: { type: "text" as const, text: "    1→a\n    2→b\n    3→c" },
      },
    ];
    expect(getResultSummary(content)).toBe("Read 3 lines");
  });

  test("singular line for single read line", () => {
    const content = [
      {
        type: "content" as const,
        content: { type: "text" as const, text: "    1→only" },
      },
    ];
    expect(getResultSummary(content)).toBe("Read 1 line");
  });

  test("truncates long first line", () => {
    const longLine = "a".repeat(100);
    const content = [
      {
        type: "content" as const,
        content: { type: "text" as const, text: longLine },
      },
    ];
    expect(getResultSummary(content)).toBe(`${"a".repeat(80)}...`);
  });

  test("returns short first line as-is", () => {
    const content = [
      {
        type: "content" as const,
        content: { type: "text" as const, text: "short result" },
      },
    ];
    expect(getResultSummary(content)).toBe("short result");
  });
});
