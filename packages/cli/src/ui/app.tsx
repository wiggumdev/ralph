import { render, useKeyboard, useRenderer } from "@opentui/solid";
import {
  createMemo,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Switch,
} from "solid-js";
import { Log } from "#log";
import type { SessionState } from "#parsers/message-types";
import type { PermissionRequest } from "#parsers/permission-types";
import type { AppState, StateProvider } from "#providers/state";
import type { AcpStateProvider } from "#providers/state/acp";
import type { PrdFeature } from "#schema/prd";
import { Chrome } from "#ui/components/chrome";
import { HelpModal } from "#ui/components/help-modal";
import { LoopTab } from "#ui/components/loop-tab";
import { PermissionModal } from "#ui/components/permission-modal";
import { PrdItemsTab } from "#ui/components/prd-items-tab";
import { SessionList } from "#ui/components/session-list";
import {
  type AppStateContextValue,
  AppStateProvider,
  type AppStatus,
  useAppState,
} from "#ui/contexts/app-state-context";
import { TabProvider, type TabView } from "#ui/contexts/tab-context";
import { UIProvider, useUI } from "#ui/contexts/ui-context";

const log = Log.create({ service: "ui" });

export interface AppProps {
  provider: StateProvider;
  maxIterations?: number;
  adapterName?: string;
  showUsage?: boolean;
  autoExit?: boolean;
}

function App(props: AppProps) {
  const renderer = useRenderer();

  // App state signals
  const [sessions, setSessions] = createSignal<SessionState[]>([]);
  const [status, setStatus] = createSignal<AppStatus>("idle");
  const [iteration, setIteration] = createSignal(0);
  const [totalInputTokens, setTotalInputTokens] = createSignal(0);
  const [totalOutputTokens, setTotalOutputTokens] = createSignal(0);
  const [totalCost, setTotalCost] = createSignal(0);
  const [toolCallCount, setToolCallCount] = createSignal(0);
  const [prdItems, setPrdItems] = createSignal<PrdFeature[]>([]);
  const [permissionRequest, setPermissionRequest] =
    createSignal<PermissionRequest | null>(null);

  // Derived from sessions
  const activeSession = createMemo(() => sessions().at(-1));
  const messages = createMemo(() => activeSession()?.messages ?? []);
  const todos = createMemo(() => activeSession()?.todos ?? []);

  // Tab state
  const [currentTab, setCurrentTab] = createSignal<TabView>("loop");

  // UI state
  const [expanded, setExpanded] = createSignal(true);
  const [helpVisible, setHelpVisible] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const maxIterations = props.maxIterations ?? 10;

  // Session navigation helpers
  const selectPrev = () => setSelectedIndex((i) => Math.max(0, i - 1));
  const selectNext = () =>
    setSelectedIndex((i) => Math.min(sessions().length - 1, i + 1));
  const selectedSession = () => sessions()[selectedIndex()];

  // Session control functions
  const togglePause = () => {
    const session = selectedSession();
    if (session?.status === "running") {
      props.provider.pause?.();
    } else if (session?.status === "paused") {
      props.provider.resume?.();
    }
  };

  const toggleSessionCollapse = (index: number) => {
    const updated = sessions().map((s, i) =>
      i === index ? { ...s, collapsed: !s.collapsed } : s
    );
    setSessions(updated);
  };

  const collapseSelected = () => {
    const idx = selectedIndex();
    const session = sessions()[idx];
    if (session && !session.collapsed) {
      toggleSessionCollapse(idx);
    }
  };

  const expandSelected = () => {
    const idx = selectedIndex();
    const session = sessions()[idx];
    if (session?.collapsed) {
      toggleSessionCollapse(idx);
    }
  };

  // Tab cycling
  const cycleTab = () => {
    const tabs: TabView[] = ["loop", "learning", "backlog"];
    const idx = tabs.indexOf(currentTab());
    const nextTab = tabs[(idx + 1) % tabs.length];
    if (nextTab) {
      setCurrentTab(nextTab);
    }
  };

  // Context values
  const appStateValue: AppStateContextValue = {
    sessions,
    activeSession,
    status,
    iteration,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    toolCallCount,
    prdItems,
    messages,
    todos,
  };

  const tabValue = { currentTab, setTab: setCurrentTab, cycleTab };
  const uiValue = { expanded, setExpanded, helpVisible, setHelpVisible };

  const handleExit = () => {
    props.provider.stop();
    renderer.destroy();
  };

  const handleOpen = async () => {
    const openCmd = props.provider.getOpenCommand?.();
    if (!openCmd) {
      return;
    }
    props.provider.stop();
    renderer.destroy();
    const { spawn } = await import("bun");
    const proc = spawn([openCmd.command, ...openCmd.args], {
      stdio: ["inherit", "inherit", "inherit"],
    });
    await proc.exited;
    process.exit(0);
  };

  const canOpen = () => props.provider.canOpen?.() ?? false;

  const setters = {
    sessions: setSessions,
    status: setStatus,
    iteration: setIteration,
    totalInputTokens: setTotalInputTokens,
    totalOutputTokens: setTotalOutputTokens,
    totalCost: setTotalCost,
    toolCallCount: setToolCallCount,
    prdItems: setPrdItems,
    permissionRequest: setPermissionRequest,
  };

  const applyStateUpdate = (update: Partial<AppState>) => {
    applySimpleUpdates(update, setters, sessions);
    applyStatusUpdate(update, setStatus, props.autoExit ?? true, handleExit);
  };

  const handlePermissionSelect = (optionId: string) => {
    const provider = props.provider as AcpStateProvider;
    provider.resolvePermission?.({ id: "", outcome: "selected", optionId });
  };

  const handlePermissionCancel = () => {
    const provider = props.provider as AcpStateProvider;
    provider.resolvePermission?.({ id: "", outcome: "cancelled" });
  };

  onMount(() => {
    const initial = props.provider.getInitialState();
    applyStateUpdate(initial);

    const unsubscribe = props.provider.subscribe(applyStateUpdate);
    onCleanup(() => {
      unsubscribe();
      props.provider.stop();
    });

    props.provider.start();
  });

  const keyHandlers: Record<string, () => void> = {
    "1": () => setCurrentTab("loop"),
    "2": () => setCurrentTab("learning"),
    "3": () => setCurrentTab("backlog"),
    tab: cycleTab,
    e: () => setExpanded((prev) => !prev),
    space: () => setExpanded((prev) => !prev),
    "?": () => setHelpVisible(true),
    j: selectNext,
    k: selectPrev,
    h: collapseSelected,
    l: expandSelected,
    o: () => {
      if (canOpen()) {
        handleOpen();
      }
    },
    p: togglePause,
    s: () => props.provider.stop(),
    x: () => props.provider.stop(),
    q: handleExit,
    escape: handleExit,
  };

  useKeyboard((key) => {
    log.debug("keypress", { key: key.name });
    if (helpVisible()) {
      setHelpVisible(false);
      return;
    }
    // Handle permission modal keys
    if (permissionRequest()) {
      if (key.name === "escape") {
        handlePermissionCancel();
        return;
      }
      const num = Number.parseInt(key.name, 10);
      if (num >= 1 && num <= 9) {
        const req = permissionRequest();
        const option = req?.options[num - 1];
        if (option) {
          handlePermissionSelect(option.optionId);
        }
        return;
      }
      return;
    }
    keyHandlers[key.name]?.();
  });

  return (
    <AppStateProvider value={appStateValue}>
      <TabProvider value={tabValue}>
        <UIProvider value={uiValue}>
          <Chrome>
            <Switch>
              <Match when={currentTab() === "loop"}>
                <LoopContent
                  canOpen={canOpen()}
                  maxIterations={maxIterations}
                  onToggleSession={toggleSessionCollapse}
                  selectedIndex={selectedIndex}
                />
              </Match>
              <Match when={currentTab() === "learning"}>
                <LearningTab />
              </Match>
              <Match when={currentTab() === "backlog"}>
                <BacklogTab />
              </Match>
            </Switch>
          </Chrome>
          <HelpModal
            onClose={() => setHelpVisible(false)}
            visible={helpVisible()}
          />
          <PermissionModal
            onCancel={handlePermissionCancel}
            onSelect={handlePermissionSelect}
            request={permissionRequest()}
          />
        </UIProvider>
      </TabProvider>
    </AppStateProvider>
  );
}

// Helper to apply simple field updates
function applySimpleUpdates(
  update: Partial<AppState>,
  setters: {
    sessions: (v: SessionState[]) => void;
    iteration: (v: number) => void;
    totalInputTokens: (v: number) => void;
    totalOutputTokens: (v: number) => void;
    totalCost: (v: number) => void;
    toolCallCount: (v: number) => void;
    prdItems: (v: PrdFeature[]) => void;
    permissionRequest: (v: PermissionRequest | null) => void;
  },
  getSessions: () => SessionState[]
) {
  if (update.sessions !== undefined) {
    // Preserve local UI state (collapsed) when merging sessions
    const currentSessions = getSessions();
    const collapsedMap = new Map(
      currentSessions.map((s) => [s.id, s.collapsed])
    );
    const merged = update.sessions.map((s) => ({
      ...s,
      collapsed: collapsedMap.get(s.id) ?? s.collapsed,
    }));
    setters.sessions(merged);
  }
  if (update.iteration !== undefined) {
    setters.iteration(update.iteration);
  }
  if (update.totalInputTokens !== undefined) {
    setters.totalInputTokens(update.totalInputTokens);
  }
  if (update.totalOutputTokens !== undefined) {
    setters.totalOutputTokens(update.totalOutputTokens);
  }
  if (update.totalCost !== undefined) {
    setters.totalCost(update.totalCost);
  }
  if (update.toolCallCount !== undefined) {
    setters.toolCallCount(update.toolCallCount);
  }
  if (update.prdItems !== undefined) {
    setters.prdItems(update.prdItems);
  }
  if (update.permissionRequest !== undefined) {
    setters.permissionRequest(update.permissionRequest);
  }
}

// Helper to apply status update with auto-exit logic
function applyStatusUpdate(
  update: Partial<AppState>,
  setStatus: (v: AppStatus) => void,
  autoExit: boolean,
  handleExit: () => void
) {
  if (update.status === undefined) {
    return;
  }
  setStatus(update.status);
  if ((update.status === "complete" || update.status === "error") && autoExit) {
    setTimeout(handleExit, 500);
  }
}

interface LoopContentProps {
  maxIterations: number;
  selectedIndex: () => number;
  canOpen: boolean;
  onToggleSession: (index: number) => void;
}

function LoopContent(props: LoopContentProps) {
  const { sessions, iteration } = useAppState();
  const { expanded } = useUI();

  const progressBar = () => {
    const width = 20;
    const filled = Math.round((iteration() / props.maxIterations) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  };

  return (
    <LoopTab
      iteration={iteration}
      maxIterations={props.maxIterations}
      progressBar={progressBar()}
    >
      <SessionList
        canOpen={props.canOpen}
        expanded={expanded()}
        onToggleSession={props.onToggleSession}
        selectedIndex={props.selectedIndex}
        sessions={sessions()}
      />
    </LoopTab>
  );
}

function LearningTab() {
  return (
    <box>
      <text>
        <span style={{ fg: "#666666" }}>Learning tab - coming soon</span>
      </text>
    </box>
  );
}

function BacklogTab() {
  const { prdItems } = useAppState();
  return <PrdItemsTab items={prdItems()} passFilter="all" searchQuery="" />;
}

export function main(props: AppProps): void {
  render(() => <App {...props} />, { useMouse: true });
}
