/**
 * Tool Use Block Tests
 *
 * Tests for helper functions in tool-use-block.tsx.
 * Validates tool icon mapping, color mapping, parameter formatting, and diff computation.
 */

import { describe, expect, test } from "bun:test";

// Extracted from tool-use-block.tsx for testing
function getToolIcon(name: string): string {
  switch (name.toLowerCase()) {
    case "glob":
      return "✱";
    case "grep":
      return "✱";
    case "read":
      return "→";
    case "write":
      return "←";
    case "edit":
      return "↔";
    case "bash":
      return "$";
    case "task":
      return "◇";
    case "todowrite":
    case "todo_write":
      return "☐";
    case "webfetch":
      return "%";
    case "askuserquestion":
      return "?";
    default:
      return "●";
  }
}

function getToolColor(name: string): string {
  switch (name.toLowerCase()) {
    case "read":
      return "#5c9cf5"; // blue
    case "write":
      return "#7fd88f"; // green
    case "edit":
      return "#f5a742"; // orange
    case "bash":
      return "#fab283"; // peach
    case "glob":
    case "grep":
      return "#9d7cd8"; // purple
    case "task":
      return "#56b6c2"; // cyan
    default:
      return "#808080";
  }
}

function formatParams(name: string, input: Record<string, unknown>): string {
  const filePath =
    (input.file_path as string) || (input.filePath as string) || "";

  switch (name.toLowerCase()) {
    case "read":
    case "write":
    case "edit":
      return filePath;
    case "bash": {
      const cmd = (input.command as string) || "";
      return cmd.length > 50 ? `${cmd.slice(0, 50)}...` : cmd;
    }
    case "glob":
      return `"${input.pattern}"`;
    case "grep": {
      const path = input.path as string;
      return path ? `"${input.pattern}" in ${path}` : `"${input.pattern}"`;
    }
    case "task":
      return (input.description as string) || "";
    case "todowrite":
    case "todo_write":
      return "";
    default:
      return "";
  }
}

describe("getToolIcon", () => {
  test("glob returns asterisk", () => {
    expect(getToolIcon("glob")).toBe("✱");
    expect(getToolIcon("Glob")).toBe("✱");
  });

  test("grep returns asterisk", () => {
    expect(getToolIcon("grep")).toBe("✱");
  });

  test("read returns arrow right", () => {
    expect(getToolIcon("read")).toBe("→");
    expect(getToolIcon("Read")).toBe("→");
  });

  test("write returns arrow left", () => {
    expect(getToolIcon("write")).toBe("←");
  });

  test("edit returns bidirectional arrow", () => {
    expect(getToolIcon("edit")).toBe("↔");
  });

  test("bash returns dollar sign", () => {
    expect(getToolIcon("bash")).toBe("$");
  });

  test("task returns diamond", () => {
    expect(getToolIcon("task")).toBe("◇");
  });

  test("todowrite returns checkbox", () => {
    expect(getToolIcon("todowrite")).toBe("☐");
    expect(getToolIcon("todo_write")).toBe("☐");
  });

  test("webfetch returns percent", () => {
    expect(getToolIcon("webfetch")).toBe("%");
  });

  test("askuserquestion returns question mark", () => {
    expect(getToolIcon("askuserquestion")).toBe("?");
  });

  test("unknown tool returns bullet", () => {
    expect(getToolIcon("unknown")).toBe("●");
    expect(getToolIcon("")).toBe("●");
  });
});

describe("getToolColor", () => {
  test("read is blue", () => {
    expect(getToolColor("read")).toBe("#5c9cf5");
  });

  test("write is green", () => {
    expect(getToolColor("write")).toBe("#7fd88f");
  });

  test("edit is orange", () => {
    expect(getToolColor("edit")).toBe("#f5a742");
  });

  test("bash is peach", () => {
    expect(getToolColor("bash")).toBe("#fab283");
  });

  test("glob and grep are purple", () => {
    expect(getToolColor("glob")).toBe("#9d7cd8");
    expect(getToolColor("grep")).toBe("#9d7cd8");
  });

  test("task is cyan", () => {
    expect(getToolColor("task")).toBe("#56b6c2");
  });

  test("unknown tool is gray", () => {
    expect(getToolColor("unknown")).toBe("#808080");
  });
});

describe("formatParams", () => {
  test("read formats file path (snake_case)", () => {
    expect(formatParams("read", { file_path: "/path/to/file.ts" })).toBe(
      "/path/to/file.ts"
    );
  });

  test("read formats file path (camelCase)", () => {
    expect(formatParams("read", { filePath: "/path/to/file.ts" })).toBe(
      "/path/to/file.ts"
    );
  });

  test("write formats file path", () => {
    expect(formatParams("write", { file_path: "/output.ts" })).toBe(
      "/output.ts"
    );
  });

  test("edit formats file path", () => {
    expect(formatParams("edit", { file_path: "/edit.ts" })).toBe("/edit.ts");
  });

  test("bash formats short command", () => {
    expect(formatParams("bash", { command: "ls -la" })).toBe("ls -la");
  });

  test("bash truncates long command", () => {
    const longCmd = "a".repeat(60);
    const result = formatParams("bash", { command: longCmd });
    expect(result).toBe(`${"a".repeat(50)}...`);
  });

  test("glob formats pattern", () => {
    expect(formatParams("glob", { pattern: "*.ts" })).toBe('"*.ts"');
  });

  test("grep formats pattern without path", () => {
    expect(formatParams("grep", { pattern: "TODO" })).toBe('"TODO"');
  });

  test("grep formats pattern with path", () => {
    expect(formatParams("grep", { pattern: "TODO", path: "src/" })).toBe(
      '"TODO" in src/'
    );
  });

  test("task formats description", () => {
    expect(formatParams("task", { description: "Find files" })).toBe(
      "Find files"
    );
  });

  test("todowrite returns empty", () => {
    expect(formatParams("todowrite", { todos: [] })).toBe("");
    expect(formatParams("todo_write", { todos: [] })).toBe("");
  });

  test("unknown tool returns empty", () => {
    expect(formatParams("unknown", {})).toBe("");
  });
});

describe("diff summary logic", () => {
  function diffSummary(added: number, removed: number): string {
    const parts: string[] = [];
    if (added > 0) {
      parts.push(`Added ${added} line${added !== 1 ? "s" : ""}`);
    }
    if (removed > 0) {
      parts.push(`removed ${removed} line${removed !== 1 ? "s" : ""}`);
    }
    return parts.join(", ");
  }

  test("only added lines", () => {
    expect(diffSummary(5, 0)).toBe("Added 5 lines");
  });

  test("single added line", () => {
    expect(diffSummary(1, 0)).toBe("Added 1 line");
  });

  test("only removed lines", () => {
    expect(diffSummary(0, 3)).toBe("removed 3 lines");
  });

  test("single removed line", () => {
    expect(diffSummary(0, 1)).toBe("removed 1 line");
  });

  test("both added and removed", () => {
    expect(diffSummary(2, 3)).toBe("Added 2 lines, removed 3 lines");
  });

  test("no changes", () => {
    expect(diffSummary(0, 0)).toBe("");
  });
});
