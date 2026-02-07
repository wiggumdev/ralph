import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { createSignal } from "solid-js";
import {
  type AppStateContextValue,
  AppStateProvider,
} from "#ui/contexts/app-state-context";
import { type TabContextValue, TabProvider } from "#ui/contexts/tab-context";
import { Chrome } from "./chrome";

function createMockAppState(): AppStateContextValue {
  const [sessions] = createSignal<any[]>([]);
  const [activeSession] = createSignal(undefined);
  const [status] = createSignal("idle" as any);
  const [iteration] = createSignal(3);
  const [maxIterations] = createSignal(10 as number | undefined);
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

function createMockTab(tab = "loop"): TabContextValue {
  const [currentTab, setTab] = createSignal(tab as any);
  return { currentTab, setTab, cycleTab: () => {} };
}

describe("Chrome + TabBar", () => {
  test("renders tab bar with loop active", async () => {
    const appState = createMockAppState();
    const tabCtx = createMockTab("loop");
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <AppStateProvider value={appState}>
          <TabProvider value={tabCtx}>
            <Chrome>
              <text>Page Content</text>
            </Chrome>
          </TabProvider>
        </AppStateProvider>
      ),
      { width: 80, height: 24 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Ralph");
    expect(frame).toContain("[1] Loop");
    expect(frame).toContain("[2] Learning");
    expect(frame).toContain("[3] Backlog");
    expect(frame).toContain("Page Content");
  });

  test("renders progress in tab bar", async () => {
    const appState = createMockAppState();
    const tabCtx = createMockTab("loop");
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <AppStateProvider value={appState}>
          <TabProvider value={tabCtx}>
            <Chrome>
              <text>Content</text>
            </Chrome>
          </TabProvider>
        </AppStateProvider>
      ),
      { width: 100, height: 24 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("3/10");
  });
});
