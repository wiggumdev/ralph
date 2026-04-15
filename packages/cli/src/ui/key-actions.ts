import type { TabView } from "#ui/contexts/tab-context";

const TABS: TabView[] = ["loop", "learning", "backlog"];

export type KeyAction =
  | { type: "dismiss_help" }
  | { type: "permission_select"; optionId: string }
  | { type: "permission_cancel" }
  | { type: "select_next" }
  | { type: "select_prev" }
  | { type: "collapse" }
  | { type: "expand" }
  | { type: "open" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "exit" }
  | { type: "set_tab"; tab: TabView }
  | { type: "cycle_tab" }
  | { type: "toggle_expand" }
  | { type: "toggle_help" }
  | { type: "none" };

export interface KeyContext {
  helpVisible: boolean;
  permissionOptions: { optionId: string }[] | null;
  sessionStatus?: string;
  canOpen: boolean;
}

export function resolveKeyAction(ctx: KeyContext, key: string): KeyAction {
  if (ctx.helpVisible) {
    return { type: "dismiss_help" };
  }

  if (ctx.permissionOptions) {
    if (key === "escape") {
      return { type: "permission_cancel" };
    }
    const num = Number.parseInt(key, 10);
    if (num >= 1 && num <= 9) {
      const option = ctx.permissionOptions[num - 1];
      if (option) {
        return { type: "permission_select", optionId: option.optionId };
      }
    }
    return { type: "none" };
  }

  switch (key) {
    case "j":
      return { type: "select_next" };
    case "k":
      return { type: "select_prev" };
    case "h":
      return { type: "collapse" };
    case "l":
      return { type: "expand" };
    case "o":
      return ctx.canOpen ? { type: "open" } : { type: "none" };
    case "p":
      if (ctx.sessionStatus === "running") {
        return { type: "pause" };
      }
      if (ctx.sessionStatus === "paused") {
        return { type: "resume" };
      }
      return { type: "none" };
    case "s":
    case "x":
      return { type: "stop" };
    case "q":
    case "escape":
      return { type: "exit" };
    case "1":
      return { type: "set_tab", tab: "loop" };
    case "2":
      return { type: "set_tab", tab: "learning" };
    case "3":
      return { type: "set_tab", tab: "backlog" };
    case "tab":
      return { type: "cycle_tab" };
    case "e":
    case "space":
      return { type: "toggle_expand" };
    case "?":
      return { type: "toggle_help" };
    default:
      return { type: "none" };
  }
}

export function cycleTab(currentTab: TabView): TabView {
  const idx = TABS.indexOf(currentTab);
  return TABS[(idx + 1) % TABS.length] ?? currentTab;
}
