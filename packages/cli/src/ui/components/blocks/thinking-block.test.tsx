import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { ThinkingBlock } from "./thinking-block";

describe("ThinkingBlock", () => {
  test("renders collapsed by default", async () => {
    const block = { type: "thinking" as const, text: "Some thinking text" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("▶");
    expect(frame).toContain("Thinking");
    expect(frame).toContain("Some thinking text");
  });

  test("truncates long text when collapsed", async () => {
    const longText = "a".repeat(100);
    const block = { type: "thinking" as const, text: longText };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} />,
      { width: 120, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("...");
    expect(frame).not.toContain("a".repeat(100));
  });

  test("shows collapse arrow when not active", async () => {
    const block = { type: "thinking" as const, text: "text" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock block={block} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("▶");
  });

  test("active block starts collapsed", async () => {
    const block = { type: "thinking" as const, text: "text" };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <ThinkingBlock active block={block} />,
      { width: 60, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("▶");
  });
});
