/**
 * Partial Tool Block Tests
 *
 * Tests for helper functions in partial-tool-block.tsx.
 * Validates pending tool description generation.
 */

import { describe, expect, test } from "bun:test";

// Extracted from partial-tool-block.tsx for testing
function getPendingDescription(
  name: string | undefined,
  input: Record<string, unknown>
): string {
  const toolName = name?.toLowerCase() || "";
  switch (toolName) {
    case "read":
      return `Reading ${input.file_path || "file"}...`;
    case "write":
      return `Writing ${input.file_path || "file"}...`;
    case "edit":
      return `Editing ${input.file_path || "file"}...`;
    case "bash":
      return "Running command...";
    case "glob":
      return `Searching for "${input.pattern || "pattern"}"...`;
    case "grep":
      return `Searching for "${input.pattern || "pattern"}"...`;
    case "task":
      return `${input.description || "Running task"}...`;
    default:
      return `Running ${name || "tool"}...`;
  }
}

describe("getPendingDescription", () => {
  test("read shows file path", () => {
    expect(getPendingDescription("read", { file_path: "/src/index.ts" })).toBe(
      "Reading /src/index.ts..."
    );
  });

  test("read shows default when no path", () => {
    expect(getPendingDescription("read", {})).toBe("Reading file...");
  });

  test("write shows file path", () => {
    expect(getPendingDescription("write", { file_path: "/output.txt" })).toBe(
      "Writing /output.txt..."
    );
  });

  test("edit shows file path", () => {
    expect(getPendingDescription("edit", { file_path: "/config.json" })).toBe(
      "Editing /config.json..."
    );
  });

  test("bash shows generic message", () => {
    expect(getPendingDescription("bash", { command: "ls -la" })).toBe(
      "Running command..."
    );
  });

  test("glob shows pattern", () => {
    expect(getPendingDescription("glob", { pattern: "*.ts" })).toBe(
      'Searching for "*.ts"...'
    );
  });

  test("glob shows default pattern", () => {
    expect(getPendingDescription("glob", {})).toBe(
      'Searching for "pattern"...'
    );
  });

  test("grep shows pattern", () => {
    expect(getPendingDescription("grep", { pattern: "TODO" })).toBe(
      'Searching for "TODO"...'
    );
  });

  test("task shows description", () => {
    expect(getPendingDescription("task", { description: "Find files" })).toBe(
      "Find files..."
    );
  });

  test("task shows default when no description", () => {
    expect(getPendingDescription("task", {})).toBe("Running task...");
  });

  test("unknown tool shows name", () => {
    expect(getPendingDescription("custom", {})).toBe("Running custom...");
  });

  test("undefined name shows 'tool'", () => {
    expect(getPendingDescription(undefined, {})).toBe("Running tool...");
  });

  test("handles case insensitivity", () => {
    expect(getPendingDescription("READ", { file_path: "/test.txt" })).toBe(
      "Reading /test.txt..."
    );
    expect(getPendingDescription("Bash", {})).toBe("Running command...");
  });
});
