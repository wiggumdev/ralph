import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CommandModule } from "yargs";
import { getAdapter } from "#adapters/index";
import { getPromptPath, loadConfig } from "#config/loader";
import { Log } from "#log";
import type { StateProvider } from "#providers/state";
import { AcpStateProvider } from "#providers/state/acp";
import { main } from "#ui/app";

export interface RunOptions {
  provider: StateProvider;
  maxIterations: number;
  adapterName: string;
  showUsage?: boolean;
}

export function runWithProvider(options: RunOptions): void {
  main({
    provider: options.provider,
    maxIterations: options.maxIterations,
    adapterName: options.adapterName,
    showUsage: options.showUsage ?? true,
  });
}

interface RunArgs {
  maxIterations?: number;
  once?: boolean;
  prompt?: string;
  cwd?: string;
  verbose?: boolean;
  yolo?: boolean;
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
      .option("yolo", {
        alias: "y",
        type: "boolean",
        describe: "Auto-approve all permission requests",
      }),

  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const config = await loadConfig({ cwd });
    const verbose = argv.verbose ?? config.verbose;

    // Initialize debug logging if verbose
    if (verbose) {
      await Log.init({
        print: false,
        logPath: path.join(cwd, `ralph-debug-${Date.now()}.log`),
        level: "DEBUG",
      });
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

    const adapter = getAdapter(config.adapter);

    // Check availability
    const available = await adapter.isAvailable();
    if (!available) {
      console.error(`Error: ${adapter.command} not found`);
      console.error(`Make sure '${adapter.command}' is installed and in PATH`);
      process.exit(1);
    }

    // Run ACP adapter with TUI
    const maxIterations = argv.maxIterations ?? config.maxIterations ?? 10;
    const yolo = argv.yolo ?? config.yolo ?? false;
    const provider = new AcpStateProvider(adapter, {
      prompt: promptContent,
      cwd,
      verbose,
      maxIterations,
      yolo,
    });

    runWithProvider({
      provider,
      maxIterations,
      adapterName: config.adapter,
      showUsage: true,
    });
  },
};
