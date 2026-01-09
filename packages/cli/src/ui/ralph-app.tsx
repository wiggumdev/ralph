import { render, useKeyboard } from "@opentui/solid";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { AdapterResult, CLIAdapter } from "#adapters/types";
import { createParser, type OutputFormat } from "#parsers";
import { readStream } from "#utils/stream";

/** Max lines to keep in output buffer */
const OUTPUT_BUFFER_SIZE = 50;

/** Delay to allow TUI to render final state before cleanup */
const TUI_CLEANUP_DELAY_MS = 500;

export interface LoopResult {
  iterations: number;
  exitReason: "complete" | "max_iterations" | "error" | "user_abort";
  lastExitCode: number;
  lastSessionId?: string;
}

export interface RalphAppProps {
  maxIterations: number;
  promptContent: string;
  cwd: string;
  verbose?: boolean;
  adapter: CLIAdapter;
  outputFormat?: OutputFormat;
  onComplete: (result: LoopResult) => void;
}

function setTerminalTitle(title: string): void {
  if (process.stdout.isTTY) {
    process.stdout.write(`\x1b]0;${title}\x07`);
  }
}

function clearTerminalTitle(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b]0;\x07");
  }
}

interface IterationContext {
  proc: ReturnType<typeof Bun.spawn> | null;
  aborted: boolean;
}

async function runIterationCapture(
  ctx: IterationContext,
  adapter: CLIAdapter,
  promptContent: string,
  cwd: string,
  verbose: boolean | undefined,
  outputFormat: OutputFormat,
  onOutput: (line: string) => void
): Promise<AdapterResult> {
  const args = adapter.buildArgs(promptContent, { verbose, cwd, outputFormat });
  ctx.proc = Bun.spawn(args, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = ctx.proc.stdout;
  const stderr = ctx.proc.stderr;

  if (
    !(stdout && stderr) ||
    typeof stdout === "number" ||
    typeof stderr === "number"
  ) {
    return { exitCode: 1, complete: false };
  }

  const stdoutReader = stdout.getReader();
  const stderrReader = stderr.getReader();

  const parser = createParser(outputFormat, adapter.completionMarker);

  const handleText = (text: string) => {
    const chunks = parser.processChunk(text);
    for (const chunk of chunks) {
      if (chunk.displayText) {
        onOutput(chunk.displayText);
      }
    }
  };

  try {
    await Promise.all([
      readStream(stdoutReader, handleText),
      readStream(stderrReader, handleText),
    ]);
  } catch (error) {
    if (!ctx.aborted) {
      throw error;
    }
  } finally {
    stdoutReader.releaseLock();
    stderrReader.releaseLock();
  }

  // Flush any remaining buffered content
  const finalChunks = parser.flush();
  for (const chunk of finalChunks) {
    if (chunk.displayText) {
      onOutput(chunk.displayText);
    }
  }

  const exitCode = await ctx.proc.exited;
  ctx.proc = null;

  if (ctx.aborted) {
    return { exitCode: 130, complete: false };
  }

  const result = parser.getResult();

  if (result.sessionId) {
    onOutput(`[SESSION] ${result.sessionId}`);
  }

  return {
    exitCode,
    complete: result.complete,
    sessionId: result.sessionId,
  };
}

function RalphApp(props: RalphAppProps) {
  const [iteration, setIteration] = createSignal(0);
  const [output, setOutput] = createSignal<string[]>([]);
  const [expanded, setExpanded] = createSignal(false);
  const [status, setStatus] = createSignal<
    "running" | "complete" | "error" | "idle"
  >("idle");
  const [exitReason, setExitReason] =
    createSignal<LoopResult["exitReason"]>("max_iterations");
  const [spinnerFrame, setSpinnerFrame] = createSignal(0);
  const [lastSessionId, setLastSessionId] = createSignal<string | undefined>();
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // Track current process for cleanup
  const ctx: IterationContext = { proc: null, aborted: false };

  useKeyboard((key) => {
    if (key.name === "e" || key.name === "space") {
      setExpanded((prev) => !prev);
    }
    if (key.name === "q" || key.name === "escape") {
      ctx.aborted = true;
      if (ctx.proc) {
        ctx.proc.kill();
      }
      clearTerminalTitle();
      props.onComplete({
        iterations: iteration(),
        exitReason: "user_abort",
        lastExitCode: 130,
        lastSessionId: lastSessionId(),
      });
    }
  });

  createEffect(() => {
    if (status() !== "running") {
      return;
    }
    const interval = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % spinnerChars.length);
    }, 80);
    onCleanup(() => clearInterval(interval));
  });

  const progressBar = () => {
    const pct = (iteration() / props.maxIterations) * 100;
    const filled = Math.round(pct / 5);
    return "█".repeat(filled) + "░".repeat(20 - filled);
  };

  const statusIcon = () => {
    switch (status()) {
      case "running":
        return spinnerChars[spinnerFrame()];
      case "complete":
        return "✓";
      case "error":
        return "✗";
      default:
        return "○";
    }
  };

  const statusColor = () => {
    switch (status()) {
      case "running":
        return "#00ff00";
      case "complete":
        return "#00ff00";
      case "error":
        return "#ff0000";
      default:
        return "#666666";
    }
  };

  const handleIterationResult = (
    result: AdapterResult,
    i: number
  ): { shouldBreak: boolean; exitCode: number } => {
    if (result.sessionId) {
      setLastSessionId(result.sessionId);
    }

    if (result.exitCode !== 0) {
      setOutput((prev) => [...prev, `[ERROR] Exit code: ${result.exitCode}`]);
      setStatus("error");
      setExitReason("error");
      return { shouldBreak: true, exitCode: result.exitCode };
    }

    if (result.complete) {
      setOutput((prev) => [...prev, "[COMPLETE] Task finished!"]);
      setStatus("complete");
      setExitReason("complete");
      return { shouldBreak: true, exitCode: result.exitCode };
    }

    setOutput((prev) => [...prev, `[OK] Iteration ${i} completed`]);
    return { shouldBreak: false, exitCode: result.exitCode };
  };

  const runLoop = async () => {
    setStatus("running");
    let lastExitCode = 0;
    const outputFormat = props.outputFormat || "stream-json";

    for (let i = 1; i <= props.maxIterations; i++) {
      if (ctx.aborted) {
        break;
      }

      setIteration(i);
      setTerminalTitle(`Ralph: ${i}/${props.maxIterations}`);
      setOutput((prev) => [
        ...prev.slice(-OUTPUT_BUFFER_SIZE),
        `--- Iteration ${i}/${props.maxIterations} ---`,
      ]);

      try {
        const result = await runIterationCapture(
          ctx,
          props.adapter,
          props.promptContent,
          props.cwd,
          props.verbose,
          outputFormat,
          (line) =>
            setOutput((prev) => [...prev.slice(-OUTPUT_BUFFER_SIZE), line])
        );

        if (ctx.aborted) {
          break;
        }

        const handled = handleIterationResult(result, i);
        lastExitCode = handled.exitCode;
        if (handled.shouldBreak) {
          break;
        }
      } catch (error) {
        setOutput((prev) => [...prev, `[ERROR] ${error}`]);
        setStatus("error");
        setExitReason("error");
        lastExitCode = 1;
        break;
      }
    }

    if (ctx.aborted) {
      return;
    }

    if (status() === "running") {
      setStatus("complete");
      setExitReason("max_iterations");
    }

    clearTerminalTitle();
    props.onComplete({
      iterations: iteration(),
      exitReason: exitReason(),
      lastExitCode,
      lastSessionId: lastSessionId(),
    });
  };

  onMount(() => {
    runLoop();
  });

  return (
    <box flexDirection="column" style={{ padding: 1 }}>
      <box>
        <text>
          <strong>Ralph Agent Loop</strong>
          <span fg="#666666"> | [e/space] toggle output | [q] quit</span>
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <text>
          <span fg={statusColor()}>{statusIcon()} </span>
          Iteration {iteration()}/{props.maxIterations}{" "}
          <span fg="#666666">{progressBar()}</span>
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <Show when={status() === "complete" && exitReason() === "complete"}>
          <text>
            <span fg="#00ff00">✓ Task marked complete by agent</span>
          </text>
        </Show>
        <Show
          when={status() === "complete" && exitReason() === "max_iterations"}
        >
          <text>
            <span fg="#ffff00">
              ⚠ Reached max iterations ({props.maxIterations})
            </span>
          </text>
        </Show>
        <Show when={status() === "error"}>
          <text>
            <span fg="#ff0000">✗ Error in iteration {iteration()}</span>
          </text>
        </Show>
      </box>

      <Show when={expanded()}>
        <scrollbox border style={{ marginTop: 1, height: 20, flexGrow: 1 }}>
          <For each={output().slice(-OUTPUT_BUFFER_SIZE)}>
            {(line) => <text>{line}</text>}
          </For>
        </scrollbox>
      </Show>

      <Show when={!expanded() && output().length > 0}>
        <box style={{ marginTop: 1 }}>
          <text>
            <span fg="#666666">
              {output().length} lines captured. Press [e] to view.
            </span>
          </text>
        </box>
      </Show>
    </box>
  );
}

export function runLoopTUI(
  props: Omit<RalphAppProps, "onComplete">
): Promise<LoopResult> {
  return new Promise((res) => {
    const onComplete = (result: LoopResult) => {
      setTimeout(() => {
        res(result);
      }, TUI_CLEANUP_DELAY_MS);
    };

    render(() => <RalphApp {...props} onComplete={onComplete} />);
  });
}

export { RalphApp };
