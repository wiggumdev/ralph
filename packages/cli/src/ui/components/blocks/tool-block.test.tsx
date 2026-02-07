import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { ToolBlock } from "./tool-block";

function createToolBlock(overrides: Record<string, any> = {}) {
  return {
    type: "tool" as const,
    toolCallId: "tc-1",
    title: "Read",
    status: "completed" as const,
    ...overrides,
  };
}

describe("ToolBlock", () => {
  test("renders read tool with icon", async () => {
    const block = createToolBlock({
      title: "Read",
      kind: "read",
      status: "completed",
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("→");
    expect(frame).toContain("✓");
  });

  test("renders bash tool", async () => {
    const block = createToolBlock({
      title: "Bash",
      kind: "execute",
      status: "in_progress",
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("$");
    expect(frame).toContain("◐");
  });

  test("renders pending status", async () => {
    const block = createToolBlock({
      title: "Glob",
      kind: "search",
      status: "pending",
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("○");
  });

  test("renders failed status", async () => {
    const block = createToolBlock({
      title: "Edit",
      kind: "edit",
      status: "failed",
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("✗");
  });

  test("returns null for TodoWrite", async () => {
    const block = createToolBlock({
      title: "TodoWrite",
      resolvedName: "TodoWrite",
      status: "completed",
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame.trim()).toBe("");
  });

  test("shows result summary for completed non-read/edit tool", async () => {
    const block = createToolBlock({
      title: "Glob",
      kind: "search",
      status: "completed",
      content: [
        {
          type: "content",
          content: { type: "text", text: "Found 5 matching files" },
        },
      ],
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Found 5 matching files");
  });

  test("renders bash tool with description from rawInput", async () => {
    const block = createToolBlock({
      title: "Bash",
      resolvedName: "Bash",
      kind: "execute",
      status: "in_progress",
      rawInput: { command: "ls -la", description: "List files" },
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Bash(List files)");
  });

  test("read with cwd shows shortened path", async () => {
    const block = createToolBlock({
      title: "Read",
      resolvedName: "Read",
      kind: "read",
      status: "completed",
      rawInput: { file_path: "/Users/user/dev/project/src/index.ts" },
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <ToolBlock
          block={block as any}
          cwd="/Users/user/dev/project"
          expanded={false}
        />
      ),
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Read(src/index.ts)");
  });

  test("shows read line count for read tool", async () => {
    const block = createToolBlock({
      title: "Read",
      kind: "read",
      status: "completed",
      rawInput: { file_path: "/test/file.ts" },
      content: [
        {
          type: "content",
          content: {
            type: "text",
            text: "    1→line1\n    2→line2\n    3→line3",
          },
        },
      ],
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ToolBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Read 3 lines");
  });
});
