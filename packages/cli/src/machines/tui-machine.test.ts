import { describe, expect, test } from "bun:test";
import { getShortestPaths } from "@xstate/graph";
import { createActor, setup } from "xstate";
import type { AcpAdapter } from "#adapters/acp";
import { tuiMachine } from "./tui-machine";
import type { LoopContext, LoopEvent, LoopInput, LoopOptions } from "./types";

function createMockAdapter(): AcpAdapter {
  return {
    name: "test",
    command: "test",
    args: [],
    isAvailable: () => Promise.resolve(true),
    run: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
    getSessionId: () => undefined,
    getResumeCommand: () => null,
    supportsLoadSession: () => false,
  } as unknown as AcpAdapter;
}

function createDefaultOptions(
  overrides: Partial<LoopOptions> = {}
): LoopOptions {
  return {
    prompt: "test prompt",
    maxIterations: 1,
    ...overrides,
  };
}

const stubLoopMachine = setup({
  types: {
    context: {} as LoopContext,
    events: {} as LoopEvent,
    input: {} as LoopInput,
  },
}).createMachine({
  initial: "idle",
  states: { idle: {} },
});

describe("tui machine initial state", () => {
  test("starts in active state", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    expect(actor.getSnapshot().value).toBe("active");
    actor.stop();
  });

  test("has default context values", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    const ctx = actor.getSnapshot().context;
    expect(ctx.currentTab).toBe("loop");
    expect(ctx.helpVisible).toBe(false);
    expect(ctx.expanded).toBe(true);
    expect(ctx.selectedIndex).toBe(0);
    expect(ctx.autoExit).toBe(false);
    expect(ctx.canOpen).toBe(false);
    actor.stop();
  });

  test("spawns loop machine on entry", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    expect(actor.getSnapshot().context.loopRef).not.toBeNull();
    actor.stop();
  });

  test("auto-starts loop machine on entry", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    const loopRef = actor.getSnapshot().context.loopRef!;
    expect(loopRef.getSnapshot().value).toEqual({ running: "initializing" });
    actor.stop();
  });
});

describe("tui machine keyboard routing", () => {
  test("number keys switch tabs", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "KEY", key: "2" });
    expect(actor.getSnapshot().context.currentTab).toBe("learning");

    actor.send({ type: "KEY", key: "3" });
    expect(actor.getSnapshot().context.currentTab).toBe("backlog");

    actor.send({ type: "KEY", key: "4" });
    expect(actor.getSnapshot().context.currentTab).toBe("permissions");

    actor.send({ type: "KEY", key: "1" });
    expect(actor.getSnapshot().context.currentTab).toBe("loop");

    actor.stop();
  });

  test("tab key cycles tabs", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    expect(actor.getSnapshot().context.currentTab).toBe("loop");
    actor.send({ type: "KEY", key: "tab" });
    expect(actor.getSnapshot().context.currentTab).toBe("learning");
    actor.send({ type: "KEY", key: "tab" });
    expect(actor.getSnapshot().context.currentTab).toBe("backlog");
    actor.send({ type: "KEY", key: "tab" });
    expect(actor.getSnapshot().context.currentTab).toBe("permissions");
    actor.send({ type: "KEY", key: "tab" });
    expect(actor.getSnapshot().context.currentTab).toBe("loop");

    actor.stop();
  });

  test("? key shows help", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "KEY", key: "?" });
    expect(actor.getSnapshot().context.helpVisible).toBe(true);

    actor.stop();
  });

  test("any key hides help when visible", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "KEY", key: "?" });
    expect(actor.getSnapshot().context.helpVisible).toBe(true);

    actor.send({ type: "KEY", key: "x" });
    expect(actor.getSnapshot().context.helpVisible).toBe(false);

    actor.stop();
  });

  test("e key toggles expand", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    expect(actor.getSnapshot().context.expanded).toBe(true);
    actor.send({ type: "KEY", key: "e" });
    expect(actor.getSnapshot().context.expanded).toBe(false);
    actor.send({ type: "KEY", key: "e" });
    expect(actor.getSnapshot().context.expanded).toBe(true);

    actor.stop();
  });

  test("space key toggles expand", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    expect(actor.getSnapshot().context.expanded).toBe(true);
    actor.send({ type: "KEY", key: "space" });
    expect(actor.getSnapshot().context.expanded).toBe(false);

    actor.stop();
  });
});

describe("tui machine direct events", () => {
  test("SET_TAB changes tab", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "SET_TAB", tab: "permissions" });
    expect(actor.getSnapshot().context.currentTab).toBe("permissions");

    actor.stop();
  });

  test("TOGGLE_HELP toggles help visibility", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "TOGGLE_HELP" });
    expect(actor.getSnapshot().context.helpVisible).toBe(true);
    actor.send({ type: "TOGGLE_HELP" });
    expect(actor.getSnapshot().context.helpVisible).toBe(false);

    actor.stop();
  });

  test("TOGGLE_EXPAND toggles expansion", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "TOGGLE_EXPAND" });
    expect(actor.getSnapshot().context.expanded).toBe(false);
    actor.send({ type: "TOGGLE_EXPAND" });
    expect(actor.getSnapshot().context.expanded).toBe(true);

    actor.stop();
  });

  test("EXIT transitions to exiting state", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    actor.send({ type: "EXIT" });
    expect(actor.getSnapshot().value).toBe("exiting");

    actor.stop();
  });
});

describe("tui machine input options", () => {
  test("respects autoExit option", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
        autoExit: true,
      },
    });
    actor.start();

    expect(actor.getSnapshot().context.autoExit).toBe(true);
    actor.stop();
  });

  test("respects canOpen option", () => {
    const actor = createActor(tuiMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
        canOpen: true,
      },
    });
    actor.start();

    expect(actor.getSnapshot().context.canOpen).toBe(true);
    actor.stop();
  });
});

describe("tui machine state coverage", () => {
  const testMachine = tuiMachine.provide({
    actors: {
      sessionMachine: stubLoopMachine,
    },
  });

  const paths = getShortestPaths(testMachine, {
    input: {
      adapter: createMockAdapter(),
      options: createDefaultOptions(),
    },
    events: [
      { type: "KEY", key: "1" },
      { type: "KEY", key: "2" },
      { type: "KEY", key: "tab" },
      { type: "KEY", key: "?" },
      { type: "KEY", key: "e" },
      { type: "SET_TAB", tab: "permissions" } as const,
      { type: "TOGGLE_HELP" },
      { type: "TOGGLE_EXPAND" },
      { type: "EXIT" },
    ],
  });

  for (const path of paths) {
    test(`reaches ${JSON.stringify(path.state.value)} via [${path.steps.map((s) => s.event.type).join(" → ")}]`, () => {
      const actor = createActor(testMachine, {
        input: {
          adapter: createMockAdapter(),
          options: createDefaultOptions(),
        },
      });
      actor.start();
      for (const step of path.steps) {
        actor.send(step.event);
      }
      expect(actor.getSnapshot().value).toEqual(path.state.value);
      actor.stop();
    });
  }
});
