import { describe, expect, test } from "bun:test";
import { cycleTab, type KeyContext, resolveKeyAction } from "./key-actions";

const base: KeyContext = {
  helpVisible: false,
  permissionOptions: null,
  canOpen: false,
};

describe("resolveKeyAction", () => {
  describe("help visible", () => {
    const ctx: KeyContext = { ...base, helpVisible: true };

    test("any key dismisses help", () => {
      expect(resolveKeyAction(ctx, "a")).toEqual({ type: "dismiss_help" });
      expect(resolveKeyAction(ctx, "1")).toEqual({ type: "dismiss_help" });
      expect(resolveKeyAction(ctx, "escape")).toEqual({ type: "dismiss_help" });
    });
  });

  describe("permission modal active", () => {
    const ctx: KeyContext = {
      ...base,
      permissionOptions: [
        { optionId: "allow" },
        { optionId: "deny" },
        { optionId: "always" },
      ],
    };

    test("escape cancels permission", () => {
      expect(resolveKeyAction(ctx, "escape")).toEqual({
        type: "permission_cancel",
      });
    });

    test("number keys select permission option", () => {
      expect(resolveKeyAction(ctx, "1")).toEqual({
        type: "permission_select",
        optionId: "allow",
      });
      expect(resolveKeyAction(ctx, "2")).toEqual({
        type: "permission_select",
        optionId: "deny",
      });
      expect(resolveKeyAction(ctx, "3")).toEqual({
        type: "permission_select",
        optionId: "always",
      });
    });

    test("out-of-range number returns none", () => {
      expect(resolveKeyAction(ctx, "4")).toEqual({ type: "none" });
      expect(resolveKeyAction(ctx, "9")).toEqual({ type: "none" });
    });

    test("non-number keys return none", () => {
      expect(resolveKeyAction(ctx, "j")).toEqual({ type: "none" });
      expect(resolveKeyAction(ctx, "?")).toEqual({ type: "none" });
    });
  });

  describe("tab switching", () => {
    test("1-3 set tabs", () => {
      expect(resolveKeyAction(base, "1")).toEqual({
        type: "set_tab",
        tab: "loop",
      });
      expect(resolveKeyAction(base, "2")).toEqual({
        type: "set_tab",
        tab: "learning",
      });
      expect(resolveKeyAction(base, "3")).toEqual({
        type: "set_tab",
        tab: "backlog",
      });
    });

    test("tab cycles tabs", () => {
      expect(resolveKeyAction(base, "tab")).toEqual({ type: "cycle_tab" });
    });
  });

  describe("expand and help toggles", () => {
    test("e toggles expand", () => {
      expect(resolveKeyAction(base, "e")).toEqual({ type: "toggle_expand" });
    });

    test("space toggles expand", () => {
      expect(resolveKeyAction(base, "space")).toEqual({
        type: "toggle_expand",
      });
    });

    test("? toggles help", () => {
      expect(resolveKeyAction(base, "?")).toEqual({ type: "toggle_help" });
    });
  });

  describe("navigation", () => {
    test("j selects next", () => {
      expect(resolveKeyAction(base, "j")).toEqual({ type: "select_next" });
    });

    test("k selects prev", () => {
      expect(resolveKeyAction(base, "k")).toEqual({ type: "select_prev" });
    });

    test("h collapses", () => {
      expect(resolveKeyAction(base, "h")).toEqual({ type: "collapse" });
    });

    test("l expands", () => {
      expect(resolveKeyAction(base, "l")).toEqual({ type: "expand" });
    });
  });

  describe("session control", () => {
    test("s and x stop", () => {
      expect(resolveKeyAction(base, "s")).toEqual({ type: "stop" });
      expect(resolveKeyAction(base, "x")).toEqual({ type: "stop" });
    });

    test("q and escape exit", () => {
      expect(resolveKeyAction(base, "q")).toEqual({ type: "exit" });
      expect(resolveKeyAction(base, "escape")).toEqual({ type: "exit" });
    });

    test("p pauses when running", () => {
      const ctx: KeyContext = { ...base, sessionStatus: "running" };
      expect(resolveKeyAction(ctx, "p")).toEqual({ type: "pause" });
    });

    test("p resumes when paused", () => {
      const ctx: KeyContext = { ...base, sessionStatus: "paused" };
      expect(resolveKeyAction(ctx, "p")).toEqual({ type: "resume" });
    });

    test("p does nothing in other states", () => {
      expect(resolveKeyAction(base, "p")).toEqual({ type: "none" });
      const ctx: KeyContext = { ...base, sessionStatus: "complete" };
      expect(resolveKeyAction(ctx, "p")).toEqual({ type: "none" });
    });

    test("o opens when supported", () => {
      const ctx: KeyContext = { ...base, canOpen: true };
      expect(resolveKeyAction(ctx, "o")).toEqual({ type: "open" });
    });

    test("o does nothing when not supported", () => {
      expect(resolveKeyAction(base, "o")).toEqual({ type: "none" });
    });
  });

  describe("unbound keys", () => {
    test("unknown keys return none", () => {
      expect(resolveKeyAction(base, "z")).toEqual({ type: "none" });
      expect(resolveKeyAction(base, "m")).toEqual({ type: "none" });
      expect(resolveKeyAction(base, "4")).toEqual({ type: "none" });
      expect(resolveKeyAction(base, "5")).toEqual({ type: "none" });
    });
  });
});

describe("cycleTab", () => {
  test("cycles through all tabs", () => {
    expect(cycleTab("loop")).toBe("learning");
    expect(cycleTab("learning")).toBe("backlog");
    expect(cycleTab("backlog")).toBe("loop");
  });
});
