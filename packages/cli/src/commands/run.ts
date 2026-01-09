import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CommandModule } from "yargs";
import { getAdapter } from "#adapters/index";
import type { CLIAdapter } from "#adapters/types";
import { getPromptPath, loadConfig } from "#config/loader";
import { ALL_MODEL_CHOICES } from "#config/schema";
import { createParser, type OutputFormat } from "#parsers";
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
  outputFormat?: string;
  logFile?: string;
  model?: string;
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

function resolvePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
}

async function validateAdapter(
  adapter: CLIAdapter,
  adapterName: string,
  outputFormat: OutputFormat
): Promise<void> {
  const available = await adapter.isAvailable();
  if (!available) {
    console.error(`Error: ${adapterName} CLI not found`);
    console.error(`Make sure '${adapterName}' is installed and in PATH`);
    process.exit(1);
  }

  if (!adapter.supportedFormats.includes(outputFormat)) {
    console.error(
      `Error: ${adapterName} does not support ${outputFormat} format`
    );
    console.error(`Supported formats: ${adapter.supportedFormats.join(", ")}`);
    process.exit(1);
  }
}

async function runOnce(
  adapter: CLIAdapter,
  promptContent: string,
  cwd: string,
  verbose?: boolean,
  outputFormat?: OutputFormat,
  model?: string
): Promise<number> {
  const args = adapter.buildArgs(promptContent, { verbose, cwd, outputFormat, model });
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
  verbose?: boolean,
  outputFormat: OutputFormat = "stream-json",
  model?: string
): Promise<LoopResult> {
  let lastExitCode = 0;
  let iterations = 0;
  let exitReason: LoopResult["exitReason"] = "max_iterations";
  let lastSessionId: string | undefined;

  for (let i = 1; i <= maxIterations; i++) {
    iterations = i;
    console.log(`\n--- Iteration ${i}/${maxIterations} ---`);

    const args = adapter.buildArgs(promptContent, {
      verbose,
      cwd,
      outputFormat,
      model,
    });
    const proc = Bun.spawn(args, {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const parser = createParser(outputFormat, adapter.completionMarker);

    const stdout = proc.stdout;
    const stderr = proc.stderr;
    if (
      !(stdout && stderr) ||
      typeof stdout === "number" ||
      typeof stderr === "number"
    ) {
      console.error("[ERROR] Failed to capture process output");
      exitReason = "error";
      lastExitCode = 1;
      break;
    }

    const stdoutReader = stdout.getReader();
    const stderrReader = stderr.getReader();

    const handleText = (text: string) => {
      const chunks = parser.processChunk(text);
      for (const chunk of chunks) {
        if (chunk.displayText) {
          process.stdout.write(`${chunk.displayText}\n`);
        }
      }
    };

    try {
      await Promise.all([
        readStream(stdoutReader, handleText),
        readStream(stderrReader, handleText),
      ]);
    } finally {
      stdoutReader.releaseLock();
      stderrReader.releaseLock();
    }

    // Flush any remaining buffered content
    const finalChunks = parser.flush();
    for (const chunk of finalChunks) {
      if (chunk.displayText) {
        process.stdout.write(`${chunk.displayText}\n`);
      }
    }

    lastExitCode = await proc.exited;

    const result = parser.getResult();

    if (result.sessionId) {
      lastSessionId = result.sessionId;
      console.log(`[SESSION] ${result.sessionId}`);
    }

    if (lastExitCode !== 0) {
      console.error(`\n[ERROR] Exit code: ${lastExitCode}`);
      exitReason = "error";
      break;
    }

    if (result.complete) {
      console.log("\n[COMPLETE] Task finished!");
      exitReason = "complete";
      break;
    }

    console.log(`\n[OK] Iteration ${i} completed`);
  }

  return { iterations, exitReason, lastExitCode, lastSessionId };
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
      })
      .option("output-format", {
        alias: "f",
        type: "string",
        choices: ["stream-json", "text"],
        describe: "Output format from CLI adapter",
        default: "stream-json",
      })
      .option("log-file", {
        alias: "l",
        type: "string",
        describe: "Write raw stream-json output to file",
      })
      .option("model", {
        alias: "m",
        type: "string",
        choices: ALL_MODEL_CHOICES,
        describe: "Model to use for the adapter",
      }),

  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const config = await loadConfig({ cwd });
    const outputFormat = (argv.outputFormat as OutputFormat) || "stream-json";

    const adapter = getAdapter(config.adapter);
    await validateAdapter(adapter, config.adapter, outputFormat);

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
    const model = argv.model ?? config.model;

    // Single iteration mode
    if (argv.once) {
      const exitCode = await runOnce(
        adapter,
        promptContent,
        cwd,
        verbose,
        outputFormat,
        model
      );
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
    const logFile = argv.logFile ? resolvePath(argv.logFile, cwd) : undefined;

    let result: LoopResult;
    if (useTui) {
      result = await runLoopTUI({
        maxIterations,
        promptContent,
        cwd,
        verbose,
        adapter,
        outputFormat,
        logFile,
        model,
      });
    } else {
      result = await runLoopPlain(
        adapter,
        promptContent,
        cwd,
        maxIterations,
        verbose,
        outputFormat,
        model
      );
    }

    process.exitCode = result.exitReason === "error" ? 1 : 0;
  },
};
