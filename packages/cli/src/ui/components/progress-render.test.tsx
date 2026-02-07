import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { createSignal } from "solid-js";
import {
  type AppStateContextValue,
  AppStateProvider,
} from "#ui/contexts/app-state-context";
import { Progress } from "./progress";

function createAppState(
  iter: number,
  max: number | undefined
): AppStateContextValue {
  const [sessions] = createSignal<any[]>([]);
  const [activeSession] = createSignal(undefined);
  const [status] = createSignal("running" as any);
  const [iteration] = createSignal(iter);
  const [maxIterations] = createSignal(max);
  const [totalInputTokens] = createSignal(0);
  const [totalOutputTokens] = createSignal(0);
  const [totalCost] = createSignal(0);
  const [toolCallCount] = createSignal(0);
  const [prdItems] = createSignal<any[]>([]);
  const [items] = createSignal<any[]>([]);
  const [todos] = createSignal<any[]>([]);
  return {
    sessions,
    activeSession,
    status,
    iteration,
    maxIterations,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    toolCallCount,
    prdItems,
    items,
    todos,
  };
}

describe("Progress rendering", () => {
  test("renders iteration/max when max defined", async () => {
    const appState = createAppState(5, 10);
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <AppStateProvider value={appState}>
          <Progress />
        </AppStateProvider>
      ),
      { width: 60, height: 5 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("5/10");
    expect(frame).toContain("█");
    expect(frame).toContain("░");
  });

  test("renders infinity symbol when max undefined", async () => {
    const appState = createAppState(3, undefined);
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <AppStateProvider value={appState}>
          <Progress />
        </AppStateProvider>
      ),
      { width: 60, height: 5 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("3");
    expect(frame).toContain("∞");
    expect(frame).not.toContain("█");
  });

  test("renders full bar at max", async () => {
    const appState = createAppState(10, 10);
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <AppStateProvider value={appState}>
          <Progress />
        </AppStateProvider>
      ),
      { width: 60, height: 5 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("10/10");
    expect(frame).not.toContain("░");
  });
});
