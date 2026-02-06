import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import type { AcpAdapter } from "#adapters/acp";
import { tuiMachine } from "#machines/tui-machine";
import type { LoopOptions } from "#machines/types";

/**
 * These tests verify the reactivity bug in @xstate/solid v2.0.0's useActor.
 *
 * useActor calls `fromActorRef(actorRef)()` — eagerly evaluating the accessor.
 * XState snapshots are class instances, so SolidJS stores can't deeply proxy
 * them. The eager call returns a dead reference to the initial snapshot.
 *
 * The fix: use useActorRef + fromActorRef separately, calling the accessor
 * inside reactive contexts (e.g. `tuiSnap().context.currentTab`).
 *
 * We test at the XState level (not SolidJS reactive layer) to prove the
 * underlying snapshot identity semantics that cause the bug.
 */

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

function createDefaultInput() {
  return {
    adapter: createMockAdapter(),
    options: createDefaultOptions(),
  };
}

describe("xstate snapshot identity (useActor bug basis)", () => {
  test("getSnapshot returns new object after state change", () => {
    const actor = createActor(tuiMachine, {
      input: createDefaultInput(),
    });
    actor.start();

    const snapBefore = actor.getSnapshot();
    expect(snapBefore.context.currentTab).toBe("loop");

    actor.send({ type: "KEY", key: "2" });

    const snapAfter = actor.getSnapshot();
    expect(snapAfter.context.currentTab).toBe("learning");

    // The captured reference is stale — this is exactly what useActor does
    expect(snapBefore.context.currentTab).toBe("loop");
    // New snapshot is a different object
    expect(snapBefore).not.toBe(snapAfter);

    actor.stop();
  });

  test("captured snapshot reference never updates (simulates useActor bug)", () => {
    const actor = createActor(tuiMachine, {
      input: createDefaultInput(),
    });
    actor.start();

    // Simulate what useActor does: capture snapshot once
    const captured = actor.getSnapshot();
    expect(captured.context.currentTab).toBe("loop");

    // Machine state changes...
    actor.send({ type: "KEY", key: "2" });
    actor.send({ type: "KEY", key: "e" });

    // But captured reference is frozen at initial state
    expect(captured.context.currentTab).toBe("loop");
    expect(captured.context.expanded).toBe(true);

    // Live accessor always returns current state
    expect(actor.getSnapshot().context.currentTab).toBe("learning");
    expect(actor.getSnapshot().context.expanded).toBe(false);

    actor.stop();
  });

  test("subscription-based accessor tracks all changes", () => {
    const actor = createActor(tuiMachine, {
      input: createDefaultInput(),
    });
    actor.start();

    // Simulate what fromActorRef does: return a function that reads latest
    let latest = actor.getSnapshot();
    actor.subscribe((snap) => {
      latest = snap;
    });
    const accessor = () => latest;

    expect(accessor().context.currentTab).toBe("loop");

    actor.send({ type: "KEY", key: "2" });
    expect(accessor().context.currentTab).toBe("learning");

    actor.send({ type: "KEY", key: "?" });
    expect(accessor().context.helpVisible).toBe(true);

    actor.stop();
  });

  test("spawned loopRef is accessible from parent snapshot", () => {
    const actor = createActor(tuiMachine, {
      input: createDefaultInput(),
    });
    actor.start();

    const snap = actor.getSnapshot();
    expect(snap.context.loopRef).not.toBeNull();
    expect(snap.context.loopRef!.getSnapshot().value).toEqual({
      running: "initializing",
    });

    actor.stop();
  });
});
