import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { TerminalBlock } from "./terminal-block";

describe("TerminalBlock", () => {
  test("renders running status", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "line1\nline2",
      truncated: false,
      status: "running",
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("◐");
    expect(frame).toContain("2 lines");
  });

  test("renders completed with exit 0", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "output",
      truncated: false,
      status: "completed",
      exitCode: 0,
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("✓");
    expect(frame).toContain("exit 0");
  });

  test("renders completed with non-zero exit", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "error output",
      truncated: false,
      status: "completed",
      exitCode: 1,
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("✗");
    expect(frame).toContain("exit 1");
  });

  test("renders failed status", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "crash",
      truncated: false,
      status: "failed",
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("✗");
  });

  test("renders truncated indicator", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "line",
      truncated: true,
      status: "completed",
      exitCode: 0,
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("(truncated)");
  });

  test("renders signal info", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "killed",
      truncated: false,
      status: "completed",
      signal: "SIGTERM",
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("SIGTERM");
  });

  test("singular line count", async () => {
    const block: any = {
      type: "terminal",
      terminalId: "t1",
      output: "single",
      truncated: false,
      status: "completed",
      exitCode: 0,
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => <TerminalBlock block={block} />,
      { width: 80, height: 10 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("1 line");
    expect(frame).not.toContain("1 lines");
  });
});
