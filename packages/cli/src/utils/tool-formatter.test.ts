import { describe, expect, test } from "bun:test";
import { formatToolDisplay } from "./tool-formatter";

describe("formatToolDisplay", () => {
  test("bash prefers description over command", () => {
    const result = formatToolDisplay("Bash", {
      description: "List files",
      command: "ls -la",
    });
    expect(result).toBe("Bash(List files)");
  });

  test("bash falls back to command when no description", () => {
    const result = formatToolDisplay("Bash", { command: "ls -la" });
    expect(result).toBe("Bash(ls -la)");
  });

  test("bash returns just name when no input", () => {
    const result = formatToolDisplay("Bash", {});
    expect(result).toBe("Bash");
  });

  test("read shows file_path", () => {
    const result = formatToolDisplay("Read", {
      file_path: "/src/index.ts",
    });
    expect(result).toBe("Read(/src/index.ts)");
  });

  test("grep shows pattern and path", () => {
    const result = formatToolDisplay("Grep", {
      pattern: "TODO",
      path: "/src",
    });
    expect(result).toBe("Grep(TODO in /src)");
  });

  test("grep shows only pattern without path", () => {
    const result = formatToolDisplay("Grep", { pattern: "TODO" });
    expect(result).toBe("Grep(TODO)");
  });

  test("grep returns name when no pattern", () => {
    const result = formatToolDisplay("Grep", {});
    expect(result).toBe("Grep");
  });

  test("glob shows pattern", () => {
    const result = formatToolDisplay("Glob", { pattern: "**/*.ts" });
    expect(result).toBe("Glob(**/*.ts)");
  });

  test("websearch shows query", () => {
    const result = formatToolDisplay("WebSearch", { query: "bun runtime" });
    expect(result).toBe("WebSearch(bun runtime)");
  });

  test("webfetch shows url", () => {
    const result = formatToolDisplay("WebFetch", {
      url: "https://example.com",
    });
    expect(result).toBe("WebFetch(https://example.com)");
  });

  test("task shows description", () => {
    const result = formatToolDisplay("Task", { description: "Run tests" });
    expect(result).toBe("Task(Run tests)");
  });

  test("unknown tool returns just name", () => {
    const result = formatToolDisplay("CustomTool", { foo: "bar" });
    expect(result).toBe("CustomTool");
  });

  test("truncates long params", () => {
    const longCmd = "a".repeat(100);
    const result = formatToolDisplay("Bash", { command: longCmd });
    expect(result).toBe(`Bash(${"a".repeat(50)}...)`);
  });

  test("edit shows file_path", () => {
    const result = formatToolDisplay("Edit", {
      file_path: "/src/utils.ts",
    });
    expect(result).toBe("Edit(/src/utils.ts)");
  });

  test("write shows file_path", () => {
    const result = formatToolDisplay("Write", {
      file_path: "/src/new.ts",
    });
    expect(result).toBe("Write(/src/new.ts)");
  });

  test("read with cwd strips prefix", () => {
    const result = formatToolDisplay(
      "Read",
      { file_path: "/Users/user/dev/project/src/index.ts" },
      50,
      "/Users/user/dev/project"
    );
    expect(result).toBe("Read(src/index.ts)");
  });

  test("edit with cwd strips prefix", () => {
    const result = formatToolDisplay(
      "Edit",
      { file_path: "/Users/user/dev/project/src/utils.ts" },
      50,
      "/Users/user/dev/project"
    );
    expect(result).toBe("Edit(src/utils.ts)");
  });

  test("write with cwd strips prefix", () => {
    const result = formatToolDisplay(
      "Write",
      { file_path: "/Users/user/dev/project/src/new.ts" },
      50,
      "/Users/user/dev/project"
    );
    expect(result).toBe("Write(src/new.ts)");
  });

  test("path outside cwd stays absolute", () => {
    const result = formatToolDisplay(
      "Read",
      { file_path: "/other/path/file.ts" },
      50,
      "/Users/user/dev/project"
    );
    expect(result).toBe("Read(/other/path/file.ts)");
  });

  test("no cwd preserves full path", () => {
    const result = formatToolDisplay("Read", {
      file_path: "/Users/user/dev/project/src/index.ts",
    });
    expect(result).toBe("Read(/Users/user/dev/project/src/index.ts)");
  });

  test("grep path param shortened with cwd", () => {
    const result = formatToolDisplay(
      "Grep",
      { pattern: "TODO", path: "/Users/user/dev/project/src" },
      50,
      "/Users/user/dev/project"
    );
    expect(result).toBe("Grep(TODO in src)");
  });
});
