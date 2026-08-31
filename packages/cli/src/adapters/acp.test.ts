/**
 * ACP Adapter Tests
 *
 * Exercises the base adapter against a fake ACP agent subprocess to cover
 * agents that do not implement optional protocol methods.
 */

import { describe, expect, test } from "bun:test";
import path from "node:path";
import type { RichMessage } from "#parsers/message-types";
import {
  AcpAdapter,
  type AcpCompletionResult,
  type AcpMessageHandler,
  type ResumeCommand,
} from "./acp";

const FAKE_AGENT = path.join(
  import.meta.dir,
  "acp",
  "__fixtures__",
  "fake-agent.ts"
);

interface FakeAgentOptions {
  preferredMode?: string | null;
  modes?: "none" | "advertise";
  setMode?: "missing" | "ok";
  noise?: boolean;
}

class FakeAcpAdapter extends AcpAdapter {
  readonly name = "fake";
  readonly command = process.execPath;
  readonly args: string[];

  private readonly preferredMode: string | null;

  constructor(options: FakeAgentOptions = {}) {
    super();
    this.preferredMode = options.preferredMode ?? null;
    this.args = [
      FAKE_AGENT,
      `--modes=${options.modes ?? "none"}`,
      `--set-mode=${options.setMode ?? "missing"}`,
      ...(options.noise ? ["--noise"] : []),
    ];
  }

  getResumeCommand(): ResumeCommand | null {
    return null;
  }

  protected override getPreferredModeId(): string | null {
    return this.preferredMode;
  }
}

interface RunOutcome {
  messages: RichMessage[];
  result?: AcpCompletionResult;
  error?: Error;
}

function modeApplied(outcome: RunOutcome, modeId: string): boolean {
  return outcome.messages.some(
    (message) =>
      message.type === "text_delta" && message.text === `set_mode:${modeId}`
  );
}

function runAdapter(adapter: AcpAdapter): Promise<RunOutcome> {
  const outcome: RunOutcome = { messages: [] };
  return new Promise((resolve) => {
    const handler: AcpMessageHandler = {
      onMessage(message) {
        outcome.messages.push(message);
      },
      onComplete(result) {
        outcome.result = result;
        resolve(outcome);
      },
      onError(error) {
        outcome.error = error;
        resolve(outcome);
      },
    };
    adapter.run("hello", {}, handler).catch((error: Error) => {
      outcome.error = error;
      resolve(outcome);
    });
  });
}

describe("AcpAdapter session modes", () => {
  test("completes when the agent advertises no modes", async () => {
    const adapter = new FakeAcpAdapter({
      preferredMode: "acceptEdits",
      modes: "none",
      setMode: "ok",
    });

    const outcome = await runAdapter(adapter);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result?.stopReason).toBe("end_turn");
    expect(outcome.result?.success).toBe(true);
    // No modes advertised means no set_mode call at all.
    expect(modeApplied(outcome, "acceptEdits")).toBe(false);
  });

  test("completes when the preferred mode is not advertised", async () => {
    const adapter = new FakeAcpAdapter({
      preferredMode: "no-such-mode",
      modes: "advertise",
      setMode: "ok",
    });

    const outcome = await runAdapter(adapter);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result?.stopReason).toBe("end_turn");
    expect(modeApplied(outcome, "no-such-mode")).toBe(false);
  });

  test("completes when an advertised set_mode call fails", async () => {
    const adapter = new FakeAcpAdapter({
      preferredMode: "acceptEdits",
      modes: "advertise",
      setMode: "missing",
    });

    const outcome = await runAdapter(adapter);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result?.stopReason).toBe("end_turn");
  });

  test("sets the mode when the agent advertises it", async () => {
    const adapter = new FakeAcpAdapter({
      preferredMode: "acceptEdits",
      modes: "advertise",
      setMode: "ok",
    });

    const outcome = await runAdapter(adapter);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result?.stopReason).toBe("end_turn");
    expect(modeApplied(outcome, "acceptEdits")).toBe(true);
  });
});

describe("AcpAdapter transport robustness", () => {
  test("ignores non-object JSON lines from the agent", async () => {
    const adapter = new FakeAcpAdapter({ noise: true });

    const outcome = await runAdapter(adapter);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result?.stopReason).toBe("end_turn");
  });
});
