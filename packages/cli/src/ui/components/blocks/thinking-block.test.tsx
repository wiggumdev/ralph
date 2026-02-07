import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { ThinkingBlock } from "./thinking-block";

describe("ThinkingBlock", () => {
  test("renders collapsed with preview", async () => {
    const block = { type: "thinking" as const, text: "Some thinking text" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} expanded={false} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Thinking");
    expect(frame).toContain("Some thinking text");
  });

  test("renders expanded with full text", async () => {
    const block = { type: "thinking" as const, text: "Full thinking content" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} expanded={true} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Thinking");
    expect(frame).toContain("Full thinking content");
  });

  test("truncates long text when collapsed", async () => {
    const longText = "a".repeat(100);
    const block = { type: "thinking" as const, text: longText };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} expanded={false} />,
      { width: 120, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("...");
    expect(frame).not.toContain("a".repeat(100));
  });

  test("shows collapse arrow when collapsed", async () => {
    const block = { type: "thinking" as const, text: "text" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} expanded={false} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("▶");
  });

  test("shows expand arrow when expanded", async () => {
    const block = { type: "thinking" as const, text: "text" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} expanded={true} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("▼");
  });
});
