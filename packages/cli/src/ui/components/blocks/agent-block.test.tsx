import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { AgentBlock } from "./agent-block";

function createAgentBlock(overrides: Record<string, any> = {}) {
  return {
    type: "agent" as const,
    toolCallId: "agent-1",
    title: "Test agent task",
    status: "completed" as const,
    items: [],
    startTime: Date.now(),
    collapsed: false,
    ...overrides,
  };
}

describe("AgentBlock", () => {
  test("renders collapsed with preview", async () => {
    const block = createAgentBlock({ title: "Research the codebase" });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <AgentBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Agent");
    expect(frame).toContain("Research the codebase");
    expect(frame).toContain("▶");
  });

  test("renders expanded with full title", async () => {
    const block = createAgentBlock({
      title: "Research the codebase thoroughly",
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <AgentBlock block={block as any} expanded={true} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Agent");
    expect(frame).toContain("▼");
  });

  test("truncates long title when collapsed", async () => {
    const longTitle =
      "This is a very long agent task title that exceeds forty characters easily";
    const block = createAgentBlock({ title: longTitle });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <AgentBlock block={block as any} expanded={false} />,
      { width: 120, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("...");
    expect(frame).not.toContain(longTitle);
  });

  test("renders status indicators", async () => {
    const pending = createAgentBlock({ status: "pending" });
    const { captureCharFrame: frame1, renderOnce: r1 } = await testRender(
      () => <AgentBlock block={pending as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await r1();
    expect(frame1()).toContain("○");

    const running = createAgentBlock({ status: "in_progress" });
    const { captureCharFrame: frame2, renderOnce: r2 } = await testRender(
      () => <AgentBlock block={running as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await r2();
    expect(frame2()).toContain("◐");
  });

  test("shows tool count in stats", async () => {
    const block = createAgentBlock({
      items: [
        {
          type: "tool",
          id: "t1",
          data: {
            type: "tool",
            toolCallId: "t1",
            title: "Read",
            status: "completed",
          },
        },
        {
          type: "tool",
          id: "t2",
          data: {
            type: "tool",
            toolCallId: "t2",
            title: "Edit",
            status: "completed",
          },
        },
      ],
    });
    const { captureCharFrame, renderOnce } = await testRender(
      () => <AgentBlock block={block as any} expanded={false} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("2 tool");
  });
});
