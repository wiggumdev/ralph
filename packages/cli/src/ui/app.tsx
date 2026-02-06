import { render, useKeyboard, useRenderer } from "@opentui/solid";
import { fromActorRef } from "@xstate/solid";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { createActor } from "xstate";
import type { AcpAdapter } from "#adapters/acp";
import { Log } from "#log";
import { getCurrentPermissionRequest } from "#machines/actions/permission-actions";
import { tuiMachine } from "#machines/tui-machine";
import type { LoopContext, LoopOptions } from "#machines/types";
import type { SessionState } from "#parsers/message-types";
import type { PermissionRequest } from "#parsers/permission-types";
import type { PrdFeature } from "#schema/prd";
import { Chrome } from "#ui/components/chrome";
import { HelpModal } from "#ui/components/help-modal";
import { PermissionModal } from "#ui/components/permission-modal";
import { SessionList } from "#ui/components/session-list";
import { LoopTab } from "#ui/components/tabs/loop";
import { PrdItemsTab } from "#ui/components/tabs/prd-items-tab";
import {
  type AppStateContextValue,
  AppStateProvider,
  type AppStatus,
  useAppState,
} from "#ui/contexts/app-state-context";
import { TabProvider, type TabView } from "#ui/contexts/tab-context";
import { UIProvider, useUI } from "#ui/contexts/ui-context";
import { PermissionsTab } from "./components/tabs/permissions-tab";

export interface AppProps {
  adapter: AcpAdapter;
  options: LoopOptions;
  maxIterations?: number;
  adapterName?: string;
  showUsage?: boolean;
  autoExit?: boolean;
}

function App(props: AppProps) {
  const renderer = useRenderer();

  // TUI machine owns top-level UI state (tabs, help, expand, etc.)
  // Use createActor + manual start instead of useActorRef to ensure
  // the actor starts synchronously (not deferred to onMount), so
  // entry actions like sendTo(START) fire before fromActorRef subscribes.
  const tuiRef = createActor(tuiMachine, {
    input: {
      adapter: props.adapter,
      options: props.options,
      autoExit: props.autoExit,
      canOpen: props.adapter.supportsLoadSession(),
    },
  });
  tuiRef.start();
  onCleanup(() => tuiRef.stop());

  const tuiSnap = fromActorRef(tuiRef);
  const tuiSend = tuiRef.send;

  // Subscribe to the spawned loop machine's snapshot
  // Manual signal + subscription to avoid stale fromActorRef with derived accessor
  const [loopSnap, setLoopSnap] = createSignal<
    | ReturnType<
        NonNullable<
          ReturnType<typeof tuiSnap>["context"]["loopRef"]
        >["getSnapshot"]
      >
    | undefined
  >();

  createEffect(() => {
    const ref = tuiSnap()?.context.loopRef;
    if (!ref) {
      setLoopSnap(undefined);
      return;
    }
    setLoopSnap(ref.getSnapshot());
    const sub = ref.subscribe((snap) => setLoopSnap(snap));
    onCleanup(() => sub.unsubscribe());
  });

  // Local session store for granular reactivity + UI-only state (collapsed)
  const [sessions, setSessions] = createStore<SessionState[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  // Sync sessions from loop machine into local store
  const log = Log.create({ service: "app" });
  createEffect(() => {
    const snap = loopSnap();
    if (!snap) {
      return;
    }
    const loopSessions = (snap as { context: LoopContext }).context.sessions;
    log.debug("session_sync", {
      loopSessionCount: loopSessions.length,
      localSessionCount: sessions.length,
      itemCounts: loopSessions.map((s) => ({
        id: s.id.slice(0, 8),
        items: s.items.length,
      })),
    });
    const currentSessions = sessions;
    const isNewIteration =
      currentSessions.length > 0 &&
      loopSessions.length > currentSessions.length;

    if (isNewIteration) {
      const collapsed = loopSessions.map((s) => ({ ...s, collapsed: true }));
      setSessions(reconcile(collapsed, { key: "id" }));
      setSelectedIndex(loopSessions.length - 1);
    } else {
      const collapsedMap = new Map(
        currentSessions.map((s) => [s.id, s.collapsed])
      );
      const merged = loopSessions.map((s) => ({
        ...s,
        collapsed: collapsedMap.get(s.id) ?? s.collapsed,
      }));
      setSessions(reconcile(merged, { key: "id" }));
    }
  });

  // Derived state from loop machine
  const loopCtx = createMemo(() => {
    const snap = loopSnap();
    return snap ? (snap as { context: LoopContext }).context : null;
  });

  const status = createMemo<AppStatus>(() => {
    const snap = loopSnap();
    if (!snap) {
      return "idle";
    }
    const value = (snap as { value: string | Record<string, string> }).value;
    if (typeof value === "object" && "running" in value) {
      return "running";
    }
    switch (value) {
      case "nextIteration":
        return "running";
      case "paused":
        return "paused";
      case "complete":
        return "complete";
      case "error":
        return "error";
      case "stopped":
        return "stopped";
      default:
        return "idle";
    }
  });

  const loopState = createMemo(() => {
    const snap = loopSnap();
    if (!snap) {
      return "idle";
    }
    const value = (snap as { value: string | Record<string, string> }).value;
    if (typeof value === "object" && "running" in value) {
      return value.running;
    }
    return typeof value === "string" ? value : "idle";
  });

  const iteration = createMemo(() => loopCtx()?.iteration ?? 0);
  const maxIterations = () => props.maxIterations;
  const totalInputTokens = createMemo(() => loopCtx()?.totalInputTokens ?? 0);
  const totalOutputTokens = createMemo(() => loopCtx()?.totalOutputTokens ?? 0);
  const totalCost = createMemo(() => loopCtx()?.totalCost ?? 0);
  const toolCallCount = createMemo(() => loopCtx()?.toolCallCount ?? 0);
  const prdItems = createMemo<PrdFeature[]>(() => loopCtx()?.prdItems ?? []);

  const activeSession = createMemo(() => sessions.at(-1));
  const items = createMemo(() => activeSession()?.items ?? []);
  const todos = createMemo(() => activeSession()?.todos ?? []);

  // Permission state from loop machine
  const permissionRequest = createMemo<PermissionRequest | null>(() => {
    const ctx = loopCtx();
    return ctx ? getCurrentPermissionRequest(ctx) : null;
  });
  const permissionSummary = createMemo(
    () => loopCtx()?.permissionSummary ?? []
  );

  // Auto-exit on terminal states
  createEffect(() => {
    const s = status();
    if (
      (s === "complete" || s === "error" || s === "stopped") &&
      props.autoExit
    ) {
      setTimeout(handleExit, 500);
    }
  });

  // Session navigation helpers
  const selectPrev = () => setSelectedIndex((i) => Math.max(0, i - 1));
  const selectNext = () =>
    setSelectedIndex((i) => Math.min(sessions.length - 1, i + 1));

  const toggleSessionCollapse = (index: number) => {
    setSessions(index, "collapsed", (c) => !c);
  };

  const collapseSelected = () => {
    const idx = selectedIndex();
    const session = sessions[idx];
    if (session && !session.collapsed) {
      toggleSessionCollapse(idx);
    }
  };

  const expandSelected = () => {
    const idx = selectedIndex();
    const session = sessions[idx];
    if (session?.collapsed) {
      toggleSessionCollapse(idx);
    }
  };

  // Context values (populated from machine state)
  const appStateValue: AppStateContextValue = {
    sessions: () => sessions,
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

  const currentTab = () => tuiSnap().context.currentTab;
  const setCurrentTab = (tab: TabView) => tuiSend({ type: "SET_TAB", tab });

  const cycleTab = () => {
    const tabs: TabView[] = ["loop", "learning", "backlog", "permissions"];
    const idx = tabs.indexOf(currentTab());
    const nextTab = tabs[(idx + 1) % tabs.length];
    if (nextTab) {
      setCurrentTab(nextTab);
    }
  };

  const tabValue = { currentTab, setTab: setCurrentTab, cycleTab };

  const expanded = () => tuiSnap().context.expanded;
  const setExpanded = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(expanded()) : v;
    if (next !== expanded()) {
      tuiSend({ type: "TOGGLE_EXPAND" });
    }
  };
  const helpVisible = () => tuiSnap().context.helpVisible;
  const setHelpVisible = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(helpVisible()) : v;
    if (next !== helpVisible()) {
      tuiSend({ type: "TOGGLE_HELP" });
    }
  };

  const uiValue = { expanded, setExpanded, helpVisible, setHelpVisible };

  const handleExit = () => {
    tuiSend({ type: "EXIT" });
    renderer.destroy();
    process.exit(0);
  };

  const handleOpen = async () => {
    const sessionId = props.adapter.getSessionId();
    if (!sessionId) {
      return;
    }
    const openCmd = props.adapter.getResumeCommand(sessionId);
    if (!openCmd) {
      return;
    }
    tuiSend({ type: "STOP" });
    renderer.destroy();
    const { spawn } = await import("bun");
    const proc = spawn([openCmd.command, ...openCmd.args], {
      stdio: ["inherit", "inherit", "inherit"],
    });
    await proc.exited;
    process.exit(0);
  };

  const canOpen = () => props.adapter.supportsLoadSession();

  const handlePermissionSelect = (optionId: string) => {
    tuiSend({
      type: "PERMISSION_RESPONSE",
      response: { id: "", outcome: "selected", optionId },
    });
  };

  const handlePermissionCancel = () => {
    tuiSend({
      type: "PERMISSION_RESPONSE",
      response: { id: "", outcome: "cancelled" },
    });
  };

  // Keyboard handling - delegate most keys to TUI machine
  useKeyboard((key) => {
    if (helpVisible()) {
      tuiSend({ type: "TOGGLE_HELP" });
      return;
    }

    // Permission modal keys
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

    // Navigation + control keys handled locally
    const localHandlers: Record<string, () => void> = {
      j: selectNext,
      k: selectPrev,
      h: collapseSelected,
      l: expandSelected,
      o: () => {
        if (canOpen()) {
          handleOpen();
        }
      },
      p: () => {
        const session = sessions[selectedIndex()];
        if (session?.status === "running") {
          tuiSend({ type: "PAUSE" });
        } else if (session?.status === "paused") {
          tuiSend({ type: "RESUME" });
        }
      },
      s: () => tuiSend({ type: "STOP" }),
      x: () => tuiSend({ type: "STOP" }),
      q: handleExit,
      escape: handleExit,
    };

    const handler = localHandlers[key.name];
    if (handler) {
      handler();
      return;
    }

    // Tab/expand/help keys go to TUI machine
    tuiSend({ type: "KEY", key: key.name });
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
                  loopState={loopState()}
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
              <Match when={currentTab() === "permissions"}>
                <PermissionsTab summary={permissionSummary()} />
              </Match>
            </Switch>
          </Chrome>
          <HelpModal
            onClose={() => tuiSend({ type: "TOGGLE_HELP" })}
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

interface LoopContentProps {
  selectedIndex: () => number;
  canOpen: boolean;
  loopState?: string;
  onToggleSession: (index: number) => void;
}

function LoopContent(props: LoopContentProps) {
  const { sessions } = useAppState();
  const { expanded } = useUI();

  return (
    <LoopTab>
      <SessionList
        canOpen={props.canOpen}
        expanded={expanded()}
        loopState={props.loopState}
        onToggleSession={props.onToggleSession}
        selectedIndex={props.selectedIndex}
        sessions={sessions()}
      />
    </LoopTab>
  );
}

function LearningTab() {
  return (
    <box flexDirection="column" style={{ flexGrow: 1 }}>
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
  render(() => <App {...props} />, { useMouse: true, exitOnCtrlC: true });
}
