import { describe, expect, mock, test } from "bun:test";
import { getShortestPaths } from "@xstate/graph";
import { createActor, fromCallback } from "xstate";
import type { AcpAdapter } from "#adapters/acp";
import { sessionMachine } from "./session-machine";
import type { LoopOptions } from "./types";

function createMockAdapter(
  opts: { runCount?: { value: number } } = {}
): AcpAdapter {
  return {
    name: "test",
    command: "test",
    args: [],
    isAvailable: () => Promise.resolve(true),
    run: (_prompt: string, _options: unknown, _handler: unknown) => {
      if (opts.runCount) {
        opts.runCount.value++;
      }
      return Promise.resolve();
    },
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

describe("session machine state transitions", () => {
  test("starts in idle state", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();

    expect(actor.getSnapshot().value).toBe("idle");
    actor.stop();
  });

  test("transitions to running.initializing on START", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    expect(actor.getSnapshot().value).toEqual({ running: "initializing" });
    actor.stop();
  });

  test("system MESSAGE transitions from initializing to prompting", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({
      type: "MESSAGE",
      message: { type: "system", timestamp: Date.now() },
    });

    expect(actor.getSnapshot().value).toEqual({ running: "prompting" });
    actor.stop();
  });

  test("text_delta MESSAGE in prompting transitions to streaming", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({
      type: "MESSAGE",
      message: { type: "system", timestamp: Date.now() },
    });
    actor.send({
      type: "MESSAGE",
      message: { type: "text_delta", text: "hi", timestamp: Date.now() },
    });

    expect(actor.getSnapshot().value).toEqual({ running: "streaming" });
    actor.stop();
  });

  test("non-content MESSAGE in prompting stays in prompting", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({
      type: "MESSAGE",
      message: { type: "system", timestamp: Date.now() },
    });
    actor.send({
      type: "MESSAGE",
      message: {
        type: "result",
        subtype: "success",
        result: "ok",
        complete: true,
        timestamp: Date.now(),
      },
    });

    expect(actor.getSnapshot().value).toEqual({ running: "prompting" });
    actor.stop();
  });

  test("transitions to running.streaming on first content MESSAGE", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({
      type: "MESSAGE",
      message: { type: "system", timestamp: Date.now() },
    });
    actor.send({
      type: "MESSAGE",
      message: { type: "text_delta", text: "hi", timestamp: Date.now() },
    });

    expect(actor.getSnapshot().value).toEqual({ running: "streaming" });
    expect(actor.getSnapshot().context.messageCount).toBe(2);
    actor.stop();
  });

  test("stays in running.streaming on subsequent MESSAGEs", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({
      type: "MESSAGE",
      message: { type: "system", timestamp: Date.now() },
    });
    actor.send({
      type: "MESSAGE",
      message: { type: "text_delta", text: "hi", timestamp: Date.now() },
    });
    actor.send({
      type: "MESSAGE",
      message: { type: "text_delta", text: " there", timestamp: Date.now() },
    });

    expect(actor.getSnapshot().value).toEqual({ running: "streaming" });
    expect(actor.getSnapshot().context.messageCount).toBe(3);
    actor.stop();
  });

  test("initializes session on entering running state", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    const ctx = actor.getSnapshot().context;
    expect(ctx.sessions).toHaveLength(1);
    expect(ctx.currentSession).not.toBeNull();
    expect(ctx.currentSession?.status).toBe("running");
    expect(ctx.iteration).toBe(1);
    actor.stop();
  });

  test("transitions to stopped on STOP from running", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "STOP" });

    expect(actor.getSnapshot().value).toBe("stopped");
    actor.stop();
  });

  test("transitions to paused on PAUSE from running", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "PAUSE" });

    expect(actor.getSnapshot().value).toBe("paused");
    const ctx = actor.getSnapshot().context;
    expect(ctx.currentSession?.status).toBe("paused");
    actor.stop();
  });

  test("transitions from paused to running on RESUME", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "PAUSE" });
    actor.send({ type: "RESUME" });

    expect(actor.getSnapshot().value).toEqual({ running: "initializing" });
    const ctx = actor.getSnapshot().context;
    expect(ctx.currentSession?.status).toBe("running");
    actor.stop();
  });

  test("transitions to error on ERROR event", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "ERROR", error: new Error("test error") });

    expect(actor.getSnapshot().value).toBe("error");
    expect(actor.getSnapshot().context.error?.message).toBe("test error");
    actor.stop();
  });
});

describe("session machine message processing", () => {
  test("processes text_delta messages", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "MESSAGE",
      message: {
        type: "text_delta",
        text: "Hello ",
        timestamp: Date.now(),
      },
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.textBuffer).toBe("Hello ");
    expect(ctx.currentSession?.items).toHaveLength(1);
    expect(ctx.currentSession?.items[0]?.type).toBe("text_delta");
    actor.stop();
  });

  test("accumulates text_delta messages", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "MESSAGE",
      message: { type: "text_delta", text: "Hello ", timestamp: Date.now() },
    });
    actor.send({
      type: "MESSAGE",
      message: { type: "text_delta", text: "world!", timestamp: Date.now() },
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.textBuffer).toBe("Hello world!");
    // Should still be single item (accumulated)
    expect(ctx.currentSession?.items).toHaveLength(1);
    actor.stop();
  });

  test("processes thinking_delta messages", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "MESSAGE",
      message: {
        type: "thinking_delta",
        text: "Let me think...",
        timestamp: Date.now(),
      },
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.thinkingBuffer).toBe("Let me think...");
    expect(ctx.currentSession?.activity).toBe("thinking");
    actor.stop();
  });

  test("detects promise complete in text_delta", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 5 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "MESSAGE",
      message: {
        type: "text_delta",
        text: "Done! <promise>Complete</promise>",
        timestamp: Date.now(),
      },
    });

    expect(actor.getSnapshot().context.promiseComplete).toBe(true);
    actor.stop();
  });

  test("detects promise complete split across chunks", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 5 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "MESSAGE",
      message: {
        type: "text_delta",
        text: "Done! <promise>Comp",
        timestamp: Date.now(),
      },
    });
    actor.send({
      type: "MESSAGE",
      message: {
        type: "text_delta",
        text: "lete</promise>",
        timestamp: Date.now(),
      },
    });

    expect(actor.getSnapshot().context.promiseComplete).toBe(true);
    actor.stop();
  });
});

describe("session machine iteration control", () => {
  test("COMPLETE with promiseComplete goes to complete state", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 5 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    // Set promiseComplete via text delta
    actor.send({
      type: "MESSAGE",
      message: {
        type: "text_delta",
        text: "<promise>Complete</promise>",
        timestamp: Date.now(),
      },
    });
    actor.send({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    expect(actor.getSnapshot().value).toBe("complete");
    actor.stop();
  });

  test("COMPLETE with more iterations goes to nextIteration", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 3 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    expect(actor.getSnapshot().value).toBe("nextIteration");
    actor.stop();
  });

  test("COMPLETE at maxIterations goes to complete", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 1 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    expect(actor.getSnapshot().value).toBe("complete");
    actor.stop();
  });

  test("nextIteration increments iteration and returns to running", async () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 3 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    // Wait for the 100ms delay in nextIteration
    await new Promise((r) => setTimeout(r, 150));

    expect(actor.getSnapshot().value).toEqual({ running: "initializing" });
    expect(actor.getSnapshot().context.iteration).toBe(2);
    actor.stop();
  });

  test("completes session on iteration end", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: 1 }),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    // Session should be running
    expect(actor.getSnapshot().context.currentSession?.status).toBe("running");

    actor.send({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    // Session should be complete
    const ctx = actor.getSnapshot().context;
    expect(ctx.currentSession).toBeNull();
    expect(ctx.sessions).toHaveLength(1);
    expect(ctx.sessions[0]?.status).toBe("complete");
    actor.stop();
  });

  test("infinite mode (no maxIterations) continues looping", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions({ maxIterations: undefined }),
      },
    });
    actor.start();
    actor.send({ type: "START" });
    actor.send({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    expect(actor.getSnapshot().value).toBe("nextIteration");
    actor.stop();
  });
});

describe("session machine permission handling", () => {
  test("queues permission request", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    const resolve = mock();
    actor.send({
      type: "PERMISSION_REQUEST",
      request: {
        id: "perm-1",
        sessionId: "s1",
        toolCall: { toolCallId: "tc-1", title: "Bash" } as any,
        options: [],
        timestamp: Date.now(),
      },
      resolve,
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.pendingPermissions.size).toBe(1);
    expect(ctx.currentPermissionId).toBe("tc-1");
    actor.stop();
  });

  test("resolves permission and clears queue", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    const resolve = mock();
    actor.send({
      type: "PERMISSION_REQUEST",
      request: {
        id: "perm-1",
        sessionId: "s1",
        toolCall: { toolCallId: "tc-1", title: "Bash" } as any,
        options: [],
        timestamp: Date.now(),
      },
      resolve,
    });

    actor.send({
      type: "PERMISSION_RESPONSE",
      response: { id: "perm-1", outcome: "selected", optionId: "allow" },
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.pendingPermissions.size).toBe(0);
    expect(ctx.currentPermissionId).toBeNull();
    expect(resolve).toHaveBeenCalled();
    actor.stop();
  });

  test("tracks permissions via PERMISSION_TRACKED", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "PERMISSION_TRACKED",
      formattedName: "Bash(ls)",
      status: "allowed",
    });
    actor.send({
      type: "PERMISSION_TRACKED",
      formattedName: "Bash(ls)",
      status: "allowed",
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.permissionSummary).toHaveLength(1);
    expect(ctx.permissionSummary[0]?.count).toBe(2);
    actor.stop();
  });
});

describe("session machine context totals", () => {
  test("updates totals from result message", () => {
    const actor = createActor(sessionMachine, {
      input: {
        adapter: createMockAdapter(),
        options: createDefaultOptions(),
      },
    });
    actor.start();
    actor.send({ type: "START" });

    actor.send({
      type: "MESSAGE",
      message: {
        type: "result",
        subtype: "success",
        result: "done",
        complete: true,
        total_cost_usd: 0.05,
        usage: { input_tokens: 1000, output_tokens: 500 },
        timestamp: Date.now(),
      },
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.totalInputTokens).toBe(1000);
    expect(ctx.totalOutputTokens).toBe(500);
    expect(ctx.totalCost).toBe(0.05);
    actor.stop();
  });
});

describe("session machine state coverage", () => {
  const testMachine = sessionMachine.provide({
    actors: {
      adapterSource: fromCallback(() => {}),
    },
  });

  const coverageOptions = createDefaultOptions({ maxIterations: 3 });

  const paths = getShortestPaths(testMachine, {
    input: {
      adapter: createMockAdapter(),
      options: coverageOptions,
    },
    // Serialize on state value only — context contains timestamps from
    // initSession that differ on every visit to "running", which would
    // cause infinite traversal without this.
    serializeState: (state) => JSON.stringify(state.value),
    events: [
      { type: "START" },
      { type: "STOP" },
      { type: "PAUSE" },
      { type: "RESUME" },
      { type: "COMPLETE", result: { stopReason: "end_turn" } },
      { type: "ERROR", error: new Error("test") },
      {
        type: "MESSAGE",
        message: {
          type: "system",
          timestamp: Date.now(),
        },
      },
      {
        type: "MESSAGE",
        message: {
          type: "text_delta",
          text: "hello",
          timestamp: Date.now(),
        },
      },
    ],
  });

  for (const path of paths) {
    test(`reaches ${JSON.stringify(path.state.value)} via [${path.steps.map((s) => s.event.type).join(" → ")}]`, () => {
      const actor = createActor(testMachine, {
        input: {
          adapter: createMockAdapter(),
          options: coverageOptions,
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
