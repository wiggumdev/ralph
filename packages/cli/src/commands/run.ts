import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CommandModule } from "yargs";
import { getAdapter } from "#adapters/index";
import type { CLIAdapter } from "#adapters/types";
import { getPrdPath, getPromptPath, loadConfig } from "#config/loader";
import type { Hooks } from "#config/schema";
import { createHookExecutor } from "#hooks";
import { createParser, type OutputFormat } from "#parsers";
import type { ResultMessage } from "#parsers/message-types";
import {
  isMessage,
  isResultMessage,
  isToolUseBlock,
} from "#parsers/message-types";
import type { LoopResult } from "#ui/ralph-app";
import { runLoopTUI } from "#ui/ralph-app";
import { readStream } from "#utils/stream";
import { isOutputFormat, parsePrd } from "#utils/validation";

function countTasksNotPassing(prdPath: string): number {
  if (!existsSync(prdPath)) {
    return 0;
  }
  try {
    const content = readFileSync(prdPath, "utf-8");
    const prd = parsePrd(content);
    return prd.filter((feature) => !feature.passes).length;
  } catch {
    return 0;
  }
}

interface RunArgs {
  maxIterations?: number;
  once?: boolean;
  prompt?: string;
  cwd?: string;
  verbose?: boolean;
  noTui?: boolean;
  outputFormat?: string;
  logFile?: string;
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
  outputFormat?: OutputFormat
): Promise<number> {
  const args = adapter.buildArgs(promptContent, { verbose, cwd, outputFormat });
  const proc = Bun.spawn(args, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  return await proc.exited;
}

interface RunLoopPlainOptions {
  adapter: CLIAdapter;
  promptContent: string;
  cwd: string;
  maxIterations: number;
  verbose?: boolean;
  outputFormat?: OutputFormat;
  hooks?: Hooks;
  tasksNotPassing?: number;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: loop logic is inherently complex
async function runLoopPlain(options: RunLoopPlainOptions): Promise<LoopResult> {
  const {
    adapter,
    promptContent,
    cwd,
    maxIterations,
    verbose,
    outputFormat = "stream-json",
    hooks,
    tasksNotPassing = 0,
  } = options;

  let lastExitCode = 0;
  let iterations = 0;
  let exitReason: LoopResult["exitReason"] = "max_iterations";
  let lastSessionId: string | undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let toolCallCount = 0;

  // Initialize hook executor if hooks provided
  const hookExecutor = hooks
    ? createHookExecutor({ hooks, cwd, verbose })
    : undefined;

  // Execute ralph_start hook
  if (hookExecutor) {
    await hookExecutor.executeRalphStart(tasksNotPassing, maxIterations);
  }

  for (let i = 1; i <= maxIterations; i++) {
    iterations = i;

    // Execute ralph_loop_start hook
    if (hookExecutor) {
      await hookExecutor.executeRalphLoopStart(i);
    }

    console.log(`\n--- Iteration ${i}/${maxIterations} ---`);

    const args = adapter.buildArgs(promptContent, {
      verbose,
      cwd,
      outputFormat,
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

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: stream processing requires nested conditionals
    const handleText = (text: string) => {
      const chunks = parser.processChunk(text);
      for (const chunk of chunks) {
        if (chunk.displayText) {
          process.stdout.write(`${chunk.displayText}\n`);
        }
        // Track tool calls and token usage
        if (chunk.richMessage) {
          if (isMessage(chunk.richMessage)) {
            const toolCalls = chunk.richMessage.content.filter(isToolUseBlock);
            toolCallCount += toolCalls.length;
          }
          if (isResultMessage(chunk.richMessage)) {
            const result = chunk.richMessage as ResultMessage;
            if (result.usage) {
              totalInputTokens += result.usage.input_tokens;
              totalOutputTokens += result.usage.output_tokens;
            }
            if (result.total_cost_usd !== undefined) {
              totalCost += result.total_cost_usd;
            }
          }
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
      // Track tool calls and token usage from final chunks
      if (chunk.richMessage) {
        if (isMessage(chunk.richMessage)) {
          const toolCalls = chunk.richMessage.content.filter(isToolUseBlock);
          toolCallCount += toolCalls.length;
        }
        if (isResultMessage(chunk.richMessage)) {
          const result = chunk.richMessage as ResultMessage;
          if (result.usage) {
            totalInputTokens += result.usage.input_tokens;
            totalOutputTokens += result.usage.output_tokens;
          }
          if (result.total_cost_usd !== undefined) {
            totalCost += result.total_cost_usd;
          }
        }
      }
    }

    lastExitCode = await proc.exited;

    const result = parser.getResult();

    if (result.sessionId) {
      lastSessionId = result.sessionId;
      console.log(`[SESSION] ${result.sessionId}`);
    }

    // Execute ralph_loop_end hook
    if (hookExecutor) {
      await hookExecutor.executeRalphLoopEnd(i);
    }

    if (lastExitCode !== 0) {
      console.error(`\n[ERROR] Exit code: ${lastExitCode}`);
      exitReason = "error";
      break;
    }

    if (result.complete) {
      console.log("\n[COMPLETE] Task finished!");
      exitReason = "complete";
      // Execute ralph_complete hook
      if (hookExecutor) {
        await hookExecutor.executeRalphComplete(i);
      }
      break;
    }

    console.log(`\n[OK] Iteration ${i} completed`);
  }

  // Execute ralph_max_iterations hook if we reached max without completing
  if (exitReason === "max_iterations" && hookExecutor) {
    await hookExecutor.executeRalphMaxIterations(iterations);
  }

  return {
    iterations,
    exitReason,
    lastExitCode,
    lastSessionId,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    toolCallCount,
  };
}

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

function getOutcomeIcon(exitReason: LoopResult["exitReason"]): string {
  if (exitReason === "complete") {
    return "\u2713";
  }
  if (exitReason === "error" || exitReason === "user_abort") {
    return "\u2717";
  }
  return "\u26A0";
}

function getOutcomeLabel(exitReason: LoopResult["exitReason"]): string {
  if (exitReason === "complete") {
    return "Task completed successfully";
  }
  if (exitReason === "error") {
    return "Task failed with error";
  }
  if (exitReason === "user_abort") {
    return "Task aborted by user";
  }
  return "Reached maximum iterations";
}

function printSummary(result: LoopResult): void {
  console.log(`\n${"=".repeat(50)}`);
  console.log("                    SUMMARY");
  console.log("=".repeat(50));

  const outcomeIcon = getOutcomeIcon(result.exitReason);
  const outcomeLabel = getOutcomeLabel(result.exitReason);

  console.log(`\n  Outcome:     ${outcomeIcon} ${outcomeLabel}`);
  console.log(`  Iterations:  ${result.iterations}`);

  if (result.toolCallCount !== undefined && result.toolCallCount > 0) {
    console.log(`  Tool calls:  ${result.toolCallCount}`);
  }

  const hasTokenData =
    (result.totalInputTokens && result.totalInputTokens > 0) ||
    (result.totalOutputTokens && result.totalOutputTokens > 0);

  if (hasTokenData) {
    console.log(
      `  Tokens:      ${formatTokens(result.totalInputTokens || 0)} in / ${formatTokens(result.totalOutputTokens || 0)} out`
    );
  }

  if (result.totalCost !== undefined && result.totalCost > 0) {
    console.log(`  Total cost:  ${formatCost(result.totalCost)}`);
  }

  if (result.lastSessionId) {
    console.log(`  Session:     ${result.lastSessionId}`);
  }

  console.log(`\n${"=".repeat(50)}`);
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
        choices: ["stream-json", "opencode-json", "text"],
        describe:
          "Output format from CLI adapter (defaults to adapter preference)",
      })
      .option("log-file", {
        alias: "l",
        type: "string",
        describe: "Write raw stream-json output to file",
      }),

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CLI handler requires multiple config checks
  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const config = await loadConfig({ cwd });

    const adapter = getAdapter(config.adapter);
    // Use specified format, or fall back to adapter's preferred format
    let outputFormat: OutputFormat;
    if (argv.outputFormat && isOutputFormat(argv.outputFormat)) {
      outputFormat = argv.outputFormat;
    } else if (argv.outputFormat) {
      throw new Error(
        `Invalid output format: ${argv.outputFormat}. Valid formats: stream-json, opencode-json, text`
      );
    } else {
      const defaultFormat = adapter.supportedFormats[0];
      if (!defaultFormat) {
        throw new Error(
          `Adapter ${config.adapter} has no supported formats configured`
        );
      }
      outputFormat = defaultFormat;
    }
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

    // Single iteration mode
    if (argv.once) {
      const exitCode = await runOnce(
        adapter,
        promptContent,
        cwd,
        verbose,
        outputFormat
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
    const prdPath = getPrdPath(config, cwd);
    const tasksNotPassing = countTasksNotPassing(prdPath);

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
        showUsage: config.showUsage,
        plansDir: config.plansDir,
        prdPath,
        hooks: config.hooks,
        tasksNotPassing,
      });
    } else {
      result = await runLoopPlain({
        adapter,
        promptContent,
        cwd,
        maxIterations,
        verbose,
        outputFormat,
        hooks: config.hooks,
        tasksNotPassing,
      });
    }

    printSummary(result);
    process.exitCode = result.exitReason === "error" ? 1 : 0;
  },
};
