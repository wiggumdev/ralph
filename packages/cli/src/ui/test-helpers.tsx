import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import type {
  SessionItem,
  SessionState,
  TodoItem,
} from "#parsers/message-types";
import type { PrdFeature } from "#schema/prd";
import {
  type AppStateContextValue,
  AppStateProvider,
} from "#ui/contexts/app-state-context";
import { type TabContextValue, TabProvider } from "#ui/contexts/tab-context";
import { type UIContextValue, UIProvider } from "#ui/contexts/ui-context";

export function createMockAppState(
  overrides?: Partial<Record<keyof AppStateContextValue, unknown>>
): AppStateContextValue {
  const [sessions] = createSignal<SessionState[]>(
    (overrides?.sessions as SessionState[]) ?? []
  );
  const [activeSession] = createSignal<SessionState | undefined>(
    (overrides?.activeSession as SessionState | undefined) ?? undefined
  );
  const [status] = createSignal(overrides?.status ?? "idle");
  const [iteration] = createSignal((overrides?.iteration as number) ?? 0);
  const [maxIterations] = createSignal(
    (overrides?.maxIterations as number | undefined) ?? undefined
  );
  const [totalInputTokens] = createSignal(0);
  const [totalOutputTokens] = createSignal(0);
  const [totalCost] = createSignal(0);
  const [toolCallCount] = createSignal(0);
  const [prdItems] = createSignal<PrdFeature[]>([]);
  const [items] = createSignal<SessionItem[]>([]);
  const [todos] = createSignal<TodoItem[]>([]);

  return {
    sessions,
    activeSession,
    status: status as any,
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

export function createMockTabContext(
  overrides?: Partial<Record<keyof TabContextValue, unknown>>
): TabContextValue {
  const [currentTab, setCurrentTab] = createSignal(
    (overrides?.currentTab as "loop" | "learning" | "backlog") ?? "loop"
  );
  return {
    currentTab,
    setTab: (tab) => setCurrentTab(tab),
    cycleTab: () => {},
  };
}

export function createMockUIContext(
  overrides?: Partial<Record<keyof UIContextValue, unknown>>
): UIContextValue {
  const [expanded, setExpanded] = createSignal(
    (overrides?.expanded as boolean) ?? false
  );
  const [helpVisible, setHelpVisible] = createSignal(
    (overrides?.helpVisible as boolean) ?? false
  );
  return { expanded, setExpanded, helpVisible, setHelpVisible };
}

export function withAppState(
  component: () => JSX.Element,
  overrides?: Partial<Record<keyof AppStateContextValue, unknown>>
): () => JSX.Element {
  const value = createMockAppState(overrides);
  return () => <AppStateProvider value={value}>{component()}</AppStateProvider>;
}

export function withTab(
  component: () => JSX.Element,
  overrides?: Partial<Record<keyof TabContextValue, unknown>>
): () => JSX.Element {
  const value = createMockTabContext(overrides);
  return () => <TabProvider value={value}>{component()}</TabProvider>;
}

export function withUI(
  component: () => JSX.Element,
  overrides?: Partial<Record<keyof UIContextValue, unknown>>
): () => JSX.Element {
  const value = createMockUIContext(overrides);
  return () => <UIProvider value={value}>{component()}</UIProvider>;
}

export function withProviders(
  component: () => JSX.Element,
  overrides?: {
    appState?: Partial<Record<keyof AppStateContextValue, unknown>>;
    tab?: Partial<Record<keyof TabContextValue, unknown>>;
    ui?: Partial<Record<keyof UIContextValue, unknown>>;
  }
): () => JSX.Element {
  const appState = createMockAppState(overrides?.appState);
  const tab = createMockTabContext(overrides?.tab);
  const ui = createMockUIContext(overrides?.ui);
  return () => (
    <AppStateProvider value={appState}>
      <TabProvider value={tab}>
        <UIProvider value={ui}>{component()}</UIProvider>
      </TabProvider>
    </AppStateProvider>
  );
}

export function createMockSession(
  overrides?: Partial<SessionState>
): SessionState {
  return {
    id: "test-session-id-12345678",
    iteration: 1,
    cwd: "/test",
    mcpServers: [],
    availableCommands: [],
    items: [],
    usage: { inputTokens: 0, outputTokens: 0, cost: 0, toolCallCount: 0 },
    todos: [],
    startTime: Date.now(),
    collapsed: false,
    status: "running",
    activity: "idle",
    ...overrides,
  };
}
