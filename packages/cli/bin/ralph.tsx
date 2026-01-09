#!/usr/bin/env bun

/* @jsxImportSource @opentui/solid */

import { render, useKeyboard } from "@opentui/solid";
import { spawn } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { isAbsolute, resolve } from "path";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { parseArgs } from "util";

const COMPLETE_MARKER = "<promise>COMPLETE</promise>";
const PLANS_DIR = ".plans";

const PROMPT_TEMPLATE = `
You are continuing work on a long-running autonomous development task. This is a FRESH context window - you have no memory of previous sessions.

@.plans/prd.json @.plans/progress.txt

1. Find the highest-priority feature to work on and work only on that feature. This should be the one YOU decide has the highest priority - not necessarily the first in the list

2. Before changes, search codebase (don't assume not implemented).

3. Implement the requirements for the selected feature using TDD.

3. Run typecheck and tests: \`bun run typecheck && bun run test\`

4. Update prd.json marking completed work (CAREFULLY!)

**YOU CAN ONLY MODIFY ONE FIELD: "passes"**

After thorough verification, change:
\`\`\`json
"passes": false
\`\`\`
to:
\`\`\`json
"passes": true
\`\`\`

5. Append learnings to .plans/progress.txt for future iterations.

6. Commit changes: \`jj commit -m "description"\`

ONLY WORK ON A SINGLE FEATURE PER ITERATION.

If all features complete, output <promise>COMPLETE</promise>

When you learn something new about how to run commands or patterns in the code make sure you update @CLAUDE.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.

For any bugs you notice, it's important to resolve them or document them in @prd.json to be resolved using a subagent even if it is unrelated to the current piece of work after documenting it in @prd.json

If tests unrelated to your work fail then it's your job to resolve these tests as part of the increment of change.

Remember: You have unlimited time across many sessions. Focus on quality over speed. Production-ready is the goal.
`;

const PRD_TEMPLATE = [
  {
    category: "ui",
    title: "Feature title",
    description: "What this feature does",
    passes: false,
    acceptance: ["Criteria 1", "Criteria 2"],
  },
];

interface Args {
  maxIterations?: string;
  once?: boolean;
  prompt?: string;
  cwd?: string;
  help?: boolean;
  verbose?: boolean;
}

interface LoopResult {
  iterations: number;
  exitReason: "complete" | "max_iterations" | "error";
  lastExitCode: number;
}

function printHelp(): void {
  console.log(`
ralph - Ralph Wiggum agentic loop

Runs an autonomous loop invoking Claude repeatedly until completion
or max iterations reached.

Usage:
  ralph -n <n> -p <text|file> [-c <dir>]
  ralph -o -p <text|file> [-c <dir>]
  ralph generate prompt
  ralph generate prd

Options:
  -n, --max-iterations <n>  Maximum loop iterations
  -o, --once                Run single iteration (no loop)
  -p, --prompt <text|file>  Prompt text or path to prompt file
  -c, --cwd <dir>           Working directory (default: current dir)
  -v, --verbose             Pass --debug flag to claude
  -h, --help                Show this help message

The loop exits early if Claude outputs: ${COMPLETE_MARKER}

Examples:
  ralph generate prompt
  ralph generate prd
  ralph -o -p "Fix the failing tests"
  ralph -n 10 -p .plans/PROMPT.md
`);
}

function ensurePlansDir(): void {
  const plansPath = resolve(process.cwd(), PLANS_DIR);
  if (!existsSync(plansPath)) {
    mkdirSync(plansPath, { recursive: true });
  }
}

function generatePrompt(): number {
  ensurePlansDir();
  const filePath = resolve(process.cwd(), PLANS_DIR, "PROMPT.md");

  if (existsSync(filePath)) {
    console.error(`Error: ${filePath} already exists`);
    return 1;
  }

  writeFileSync(filePath, PROMPT_TEMPLATE);
  console.log(`Created ${filePath}`);
  return 0;
}

function generatePrd(): number {
  ensurePlansDir();
  const filePath = resolve(process.cwd(), PLANS_DIR, "prd.json");

  if (existsSync(filePath)) {
    console.error(`Error: ${filePath} already exists`);
    return 1;
  }

  writeFileSync(filePath, JSON.stringify(PRD_TEMPLATE, null, 2));
  console.log(`Created ${filePath}`);
  return 0;
}

function resolvePrompt(prompt: string, cwd: string): string {
  const promptPath = isAbsolute(prompt) ? prompt : resolve(cwd, prompt);

  if (existsSync(promptPath)) {
    return readFileSync(promptPath, "utf-8");
  }

  return prompt;
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

function buildClaudeArgs(promptContent: string, verbose?: boolean): string[] {
  const args = ["claude", "--permission-mode", "acceptEdits"];
  if (verbose) {
    args.push("--debug");
  }
  args.push("-p", promptContent);
  return args;
}

async function runOnce(
  promptContent: string,
  cwd: string,
  verbose?: boolean
): Promise<number> {
  const proc = spawn(buildClaudeArgs(promptContent, verbose), {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  return await proc.exited;
}

// Run a single iteration and capture output
async function runIterationCapture(
  promptContent: string,
  cwd: string,
  verbose: boolean | undefined,
  onOutput: (line: string) => void
): Promise<{ exitCode: number; complete: boolean }> {
  let fullOutput = "";

  const proc = spawn(buildClaudeArgs(promptContent, verbose), {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  // Stream stdout
  const stdoutReader = proc.stdout.getReader();
  const stderrReader = proc.stderr.getReader();

  const readStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      fullOutput += text;
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) onOutput(line);
      }
    }
  };

  await Promise.all([readStream(stdoutReader), readStream(stderrReader)]);
  const exitCode = await proc.exited;
  const complete = fullOutput.includes(COMPLETE_MARKER);

  return { exitCode, complete };
}

// OpenTUI + SolidJS TUI Component
interface RalphAppProps {
  maxIterations: number;
  promptContent: string;
  cwd: string;
  verbose?: boolean;
  onComplete: (result: LoopResult) => void;
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
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // Keyboard handling
  useKeyboard((key) => {
    if (key.name === "e" || key.name === "space") {
      setExpanded((prev) => !prev);
    }
    if (key.name === "q" || key.name === "escape") {
      clearTerminalTitle();
      props.onComplete({
        iterations: iteration(),
        exitReason: "error",
        lastExitCode: 130,
      });
    }
  });

  // Spinner animation
  createEffect(() => {
    if (status() !== "running") return;
    const interval = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % spinnerChars.length);
    }, 80);
    onCleanup(() => clearInterval(interval));
  });

  // Progress bar
  const progressBar = () => {
    const pct = (iteration() / props.maxIterations) * 100;
    const filled = Math.round(pct / 5);
    return "█".repeat(filled) + "░".repeat(20 - filled);
  };

  // Status icon
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

  // Status color
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

  // Run the loop
  const runLoop = async () => {
    setStatus("running");
    let lastExitCode = 0;

    for (let i = 1; i <= props.maxIterations; i++) {
      setIteration(i);
      setTerminalTitle(`Ralph: ${i}/${props.maxIterations}`);
      setOutput((prev) => [
        ...prev,
        `--- Iteration ${i}/${props.maxIterations} ---`,
      ]);

      try {
        const result = await runIterationCapture(
          props.promptContent,
          props.cwd,
          props.verbose,
          (line) => setOutput((prev) => [...prev.slice(-100), line])
        );
        lastExitCode = result.exitCode;

        if (result.exitCode !== 0) {
          setOutput((prev) => [
            ...prev,
            `[ERROR] Exit code: ${result.exitCode}`,
          ]);
          setStatus("error");
          setExitReason("error");
          break;
        }

        if (result.complete) {
          setOutput((prev) => [...prev, "[COMPLETE] Task finished!"]);
          setStatus("complete");
          setExitReason("complete");
          break;
        }

        setOutput((prev) => [...prev, `[OK] Iteration ${i} completed`]);
      } catch (error) {
        setOutput((prev) => [...prev, `[ERROR] ${error}`]);
        setStatus("error");
        setExitReason("error");
        lastExitCode = 1;
        break;
      }
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
    });
  };

  onMount(() => {
    runLoop();
  });

  return (
    <box flexDirection="column" style={{ padding: 1 }}>
      {/* Header */}
      <box>
        <text>
          <strong>Ralph Wiggum Agent Loop</strong>
          <span fg="#666666"> | [e/space] toggle output | [q] quit</span>
        </text>
      </box>

      {/* Progress */}
      <box style={{ marginTop: 1 }}>
        <text>
          <span fg={statusColor()}>{statusIcon()} </span>
          Iteration {iteration()}/{props.maxIterations}{" "}
          <span fg="#666666">{progressBar()}</span>
        </text>
      </box>

      {/* Status message */}
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

      {/* Collapsible output */}
      <Show when={expanded()}>
        <scrollbox border style={{ marginTop: 1, height: 20, flexGrow: 1 }}>
          <For each={output().slice(-50)}>{(line) => <text>{line}</text>}</For>
        </scrollbox>
      </Show>

      {/* Output toggle hint */}
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

// Run loop mode with TUI
function runLoopTUI(
  maxIterations: number,
  promptContent: string,
  cwd: string,
  verbose?: boolean
): Promise<number> {
  return new Promise((resolve) => {
    const onComplete = (result: LoopResult) => {
      // Give TUI time to render final state
      setTimeout(() => {
        resolve(result.exitReason === "error" ? 1 : 0);
      }, 500);
    };

    render(() => (
      <RalphApp
        cwd={cwd}
        maxIterations={maxIterations}
        onComplete={onComplete}
        promptContent={promptContent}
        verbose={verbose}
      />
    ));
  });
}

async function main(): Promise<number> {
  const rawArgs = Bun.argv.slice(2);

  // Handle generate subcommand
  if (rawArgs[0] === "generate") {
    const target = rawArgs[1];
    if (target === "prompt") {
      return generatePrompt();
    }
    if (target === "prd") {
      return generatePrd();
    }
    console.error(`Error: Unknown generate target "${target}"`);
    console.error("Usage: ralph generate [prompt|prd]");
    return 1;
  }

  const parseOptions = {
    "max-iterations": { type: "string" as const, short: "n" as const },
    once: { type: "boolean" as const, short: "o" as const },
    prompt: { type: "string" as const, short: "p" as const },
    cwd: { type: "string" as const, short: "c" as const },
    verbose: { type: "boolean" as const, short: "v" as const },
    help: { type: "boolean" as const, short: "h" as const },
  };

  let args: Args;

  try {
    const { values } = parseArgs({
      args: rawArgs,
      options: parseOptions,
      strict: true,
      allowPositionals: false,
    });
    args = {
      maxIterations: values["max-iterations"],
      once: values.once,
      prompt: values.prompt,
      cwd: values.cwd,
      verbose: values.verbose,
      help: values.help,
    };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code?.startsWith("ERR_PARSE_ARGS")) {
      console.error(`Error: ${err.message.split(".")[0]}`);
      printHelp();
      return 1;
    }
    throw e;
  }

  if (args.help) {
    printHelp();
    return 0;
  }

  if (!args.prompt) {
    console.error("Error: --prompt is required");
    printHelp();
    return 1;
  }

  const cwd = args.cwd ? resolve(args.cwd) : process.cwd();
  const promptContent = resolvePrompt(args.prompt, cwd);

  // Single iteration mode (no TUI)
  if (args.once) {
    return runOnce(promptContent, cwd, args.verbose);
  }

  // Loop mode requires --max-iterations
  if (!args.maxIterations) {
    console.error(
      "Error: --max-iterations is required for loop mode (or use --once)"
    );
    printHelp();
    return 1;
  }

  const maxIterations = Number.parseInt(args.maxIterations, 10);
  if (isNaN(maxIterations) || maxIterations < 1) {
    console.error("Error: --max-iterations must be a positive integer");
    return 1;
  }

  // Run with TUI
  return runLoopTUI(maxIterations, promptContent, cwd, args.verbose);
}

// Main execution
if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { main, COMPLETE_MARKER };
