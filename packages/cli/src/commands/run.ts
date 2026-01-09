import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CommandModule } from "yargs";
import { getAdapter } from "#adapters/index";
import type { CLIAdapter } from "#adapters/types";
import { getPromptPath, loadConfig } from "#config/loader";
import type { LoopResult } from "#ui/ralph-app";
import { runLoopTUI } from "#ui/ralph-app";
import { readStream } from "#utils/stream";

interface RunArgs {
  maxIterations?: number;
  once?: boolean;
  prompt?: string;
  cwd?: string;
  verbose?: boolean;
  noTui?: boolean;
}

function resolvePrompt(promptArg: string | undefined, cwd: string): string {
  if (!promptArg) {
    return "";
  }
  const promptPath = path.isAbsolute(promptArg)
    ? promptArg
    : path.resolve(cwd, promptArg);

  if (existsSync(promptPath)) {
    return readFileSync(promptPath, "utf-8");
  }

  return promptArg;
}

async function runOnce(
  adapter: CLIAdapter,
  promptContent: string,
  cwd: string,
  verbose?: boolean
): Promise<number> {
  const args = adapter.buildArgs(promptContent, { verbose, cwd });
  const proc = Bun.spawn(args, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  return await proc.exited;
}

async function runLoopPlain(
  adapter: CLIAdapter,
  promptContent: string,
  cwd: string,
  maxIterations: number,
  verbose?: boolean
): Promise<LoopResult> {
  let lastExitCode = 0;
  let iterations = 0;
  let exitReason: LoopResult["exitReason"] = "max_iterations";

  for (let i = 1; i <= maxIterations; i++) {
    iterations = i;
    console.log(`\n--- Iteration ${i}/${maxIterations} ---`);

    const args = adapter.buildArgs(promptContent, { verbose, cwd });
    const proc = Bun.spawn(args, {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    let fullOutput = "";
    const stdoutReader = proc.stdout.getReader();
    const stderrReader = proc.stderr.getReader();

    const handleText = (text: string) => {
      fullOutput += text;
      process.stdout.write(text);
    };

    await Promise.all([
      readStream(stdoutReader, handleText),
      readStream(stderrReader, handleText),
    ]);
    lastExitCode = await proc.exited;

    if (lastExitCode !== 0) {
      console.error(`\n[ERROR] Exit code: ${lastExitCode}`);
      exitReason = "error";
      break;
    }

    if (adapter.detectCompletion(fullOutput)) {
      console.log("\n[COMPLETE] Task finished!");
      exitReason = "complete";
      break;
    }

    console.log(`\n[OK] Iteration ${i} completed`);
  }

  return { iterations, exitReason, lastExitCode };
}

export const runCommand: CommandModule<object, RunArgs> = {
  command: "run",
  describe: "Run the agent loop",

  builder: (yargs) =>
    yargs
      .option("max-iterations", {
        alias: "n",
        type: "number",
        describe: "Maximum loop iterations",
      })
      .option("once", {
        alias: "o",
        type: "boolean",
        describe: "Run single iteration (no loop)",
      })
      .option("prompt", {
        alias: "p",
        type: "string",
        describe: "Prompt text or path to prompt file",
      })
      .option("cwd", {
        alias: "c",
        type: "string",
        describe: "Working directory",
      })
      .option("verbose", {
        alias: "v",
        type: "boolean",
        describe: "Enable verbose output",
      })
      .option("no-tui", {
        type: "boolean",
        describe: "Disable TUI (plain text output)",
      }),

  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const config = await loadConfig({ cwd });

    // Get adapter
    const adapter = getAdapter(config.adapter);
    const available = await adapter.isAvailable();
    if (!available) {
      console.error(`Error: ${config.adapter} CLI not found`);
      console.error(`Make sure '${config.adapter}' is installed and in PATH`);
      process.exit(1);
    }

    // Resolve prompt
    let promptContent: string;
    if (argv.prompt) {
      promptContent = resolvePrompt(argv.prompt, cwd);
    } else {
      const defaultPromptPath = getPromptPath(config, cwd);
      if (!existsSync(defaultPromptPath)) {
        console.error(
          `Error: No prompt specified and ${defaultPromptPath} not found`
        );
        console.error("Use -p <prompt> or run 'ralph init' first");
        process.exit(1);
      }
      promptContent = readFileSync(defaultPromptPath, "utf-8");
    }

    if (!promptContent.trim()) {
      console.error("Error: Prompt is empty");
      process.exit(1);
    }

    const verbose = argv.verbose ?? config.verbose;

    // Single iteration mode
    if (argv.once) {
      const exitCode = await runOnce(adapter, promptContent, cwd, verbose);
      process.exit(exitCode);
    }

    // Loop mode
    const maxIterations = argv.maxIterations ?? config.maxIterations;
    if (!maxIterations || maxIterations < 1) {
      console.error("Error: --max-iterations must be a positive integer");
      console.error("Use -n <number> or set maxIterations in config");
      process.exit(1);
    }

    const useTui = config.tui && !argv.noTui;

    let result: LoopResult;
    if (useTui) {
      result = await runLoopTUI({
        maxIterations,
        promptContent,
        cwd,
        verbose,
        adapter,
      });
    } else {
      result = await runLoopPlain(
        adapter,
        promptContent,
        cwd,
        maxIterations,
        verbose
      );
    }

    const exitCode = result.exitReason === "error" ? 1 : 0;
    process.exit(exitCode);
  },
};
