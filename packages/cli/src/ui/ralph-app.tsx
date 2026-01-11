import {
  existsSync,
  readFileSync,
  unwatchFile,
  watch,
  watchFile,
} from "node:fs";
import { resolve } from "node:path";
import { render, useKeyboard, useRenderer } from "@opentui/solid";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { AdapterResult, CLIAdapter } from "#adapters/types";
import type { Hooks } from "#config/schema";
import { RALPH_ICON } from "#global";
import { createHookExecutor } from "#hooks";
import { createParser, type OutputFormat, type ParsedChunk } from "#parsers";
import type { ResultMessage, RichMessage } from "#parsers/message-types";
import {
  isMessage,
  isResultMessage,
  isToolUseBlock,
} from "#parsers/message-types";
import { type PrdFeature, validatePrd } from "#schema/prd";
import { MessageList } from "#ui/components/message-list";
import { type PassFilter, PrdItemsTab } from "#ui/components/prd-items-tab";
import type { TodoItem } from "#ui/components/session-panel";
import { JsonLogger } from "#utils/json-logger";
import { readStream } from "#utils/stream";
import { isTodoItemArray } from "#utils/validation";

/** Max items to keep in output buffer */
const OUTPUT_BUFFER_SIZE = 50;

/** Delay to allow TUI to render final state before cleanup */
const TUI_CLEANUP_DELAY_MS = 500;

export interface LoopResult {
  iterations: number;
  exitReason: "complete" | "max_iterations" | "error" | "user_abort";
  lastExitCode: number;
  lastSessionId?: string;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalCost?: number;
  toolCallCount?: number;
}

export interface RalphAppProps {
  maxIterations: number;
  promptContent: string;
  cwd: string;
  verbose?: boolean;
  adapter: CLIAdapter;
  outputFormat?: OutputFormat;
  logFile?: string;
  showUsage?: boolean;
  plansDir?: string;
  prdPath?: string;
  hooks?: Hooks;
  tasksNotPassing?: number;
  onComplete: (result: LoopResult) => void;
}

type TabView = "output" | "progress" | "prd";

function loadPrdItems(prdPath: string): PrdFeature[] {
  if (!existsSync(prdPath)) {
    return [];
  }
  try {
    const content = readFileSync(prdPath, "utf-8");
    const data = JSON.parse(content);
    const result = validatePrd(data);
    return result.valid && result.data ? result.data : [];
  } catch {
    return [];
  }
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
  onChunk: (chunk: ParsedChunk) => void,
  logger?: JsonLogger
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
      if (logger && chunk.logData) {
        logger.log(chunk.logData);
      }
      onChunk(chunk);
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
    if (logger && chunk.logData) {
      logger.log(chunk.logData);
    }
    onChunk(chunk);
  }

  const exitCode = await ctx.proc.exited;
  ctx.proc = null;

  if (ctx.aborted) {
    return { exitCode: 130, complete: false };
  }

  const result = parser.getResult();

  return {
    exitCode,
    complete: result.complete,
    sessionId: result.sessionId,
  };
}

function cycleTab(prev: TabView): TabView {
  if (prev === "output") {
    return "progress";
  }
  if (prev === "progress") {
    return "prd";
  }
  return "output";
}

function cyclePassFilter(prev: PassFilter): PassFilter {
  if (prev === "all") {
    return "passing";
  }
  if (prev === "passing") {
    return "failing";
  }
  return "all";
}

function RalphApp(props: RalphAppProps) {
  const renderer = useRenderer();
  const [iteration, setIteration] = createSignal(0);
  const [messages, setMessages] = createSignal<RichMessage[]>([]);
  const [legacyOutput, setLegacyOutput] = createSignal<string[]>([]);
  const [expanded, setExpanded] = createSignal(false);
  const [richMode, setRichMode] = createSignal(true);
  const [status, setStatus] = createSignal<
    "running" | "complete" | "error" | "idle"
  >("idle");
  const [exitReason, setExitReason] =
    createSignal<LoopResult["exitReason"]>("max_iterations");
  const [spinnerFrame, setSpinnerFrame] = createSignal(0);
  const [lastSessionId, setLastSessionId] = createSignal<string | undefined>();
  const [totalInputTokens, setTotalInputTokens] = createSignal(0);
  const [totalOutputTokens, setTotalOutputTokens] = createSignal(0);
  const [totalCost, setTotalCost] = createSignal(0);
  const [toolCallCount, setToolCallCount] = createSignal(0);
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // Tab view state
  const [currentTab, setCurrentTab] = createSignal<TabView>("output");
  const [progressContent, setProgressContent] = createSignal<string[]>([]);

  // PRD tab state
  const [prdItems, setPrdItems] = createSignal<PrdFeature[]>([]);
  const [passFilter, setPassFilter] = createSignal<PassFilter>("all");
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchMode, setSearchMode] = createSignal(false);

  // Session panel state - tracks todos from TodoWrite tool calls
  const [todos, setTodos] = createSignal<TodoItem[]>([]);

  // Progress file path
  const progressPath = () =>
    resolve(props.cwd, props.plansDir ?? ".plans", "progress.txt");

  // Read progress file content
  const readProgressFile = () => {
    const path = progressPath();
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8");
        setProgressContent(content.split("\n"));
      } catch {
        setProgressContent(["[Error reading progress.txt]"]);
      }
    } else {
      setProgressContent(["[No progress.txt found]"]);
    }
  };

  // Track current process for cleanup
  const ctx: IterationContext = { proc: null, aborted: false };

  // Initialize logger if logFile provided
  const logger = props.logFile ? new JsonLogger(props.logFile) : undefined;

  // Load PRD items and watch for changes
  createEffect(() => {
    if (props.prdPath) {
      setPrdItems(loadPrdItems(props.prdPath));

      // Watch for file changes
      watchFile(props.prdPath, { interval: 1000 }, () => {
        if (props.prdPath) {
          setPrdItems(loadPrdItems(props.prdPath));
        }
      });

      onCleanup(() => {
        if (props.prdPath) {
          unwatchFile(props.prdPath);
        }
      });
    }
  });

  // Initialize hook executor if hooks provided
  const hookExecutor = props.hooks
    ? createHookExecutor({
        hooks: props.hooks,
        cwd: props.cwd,
        verbose: props.verbose,
      })
    : undefined;

  const handleSearchModeKey = (key: { name?: string; sequence?: string }) => {
    if (key.name === "escape" || key.name === "return") {
      setSearchMode(false);
      return true;
    }
    if (key.name === "backspace") {
      setSearchQuery((prev) => prev.slice(0, -1));
      return true;
    }
    if (key.sequence && key.sequence.length === 1 && key.sequence >= " ") {
      setSearchQuery((prev) => prev + key.sequence);
      return true;
    }
    return true;
  };

  const handlePrdTabKey = (key: { name?: string }) => {
    if (key.name === "f") {
      setPassFilter(cyclePassFilter);
      return true;
    }
    if (key.name === "/") {
      setSearchMode(true);
      return true;
    }
    if (key.name === "c") {
      setSearchQuery("");
      setPassFilter("all");
      return true;
    }
    return false;
  };

  const handleQuit = () => {
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
      totalInputTokens: totalInputTokens(),
      totalOutputTokens: totalOutputTokens(),
      totalCost: totalCost(),
      toolCallCount: toolCallCount(),
    });
    renderer.destroy();
  };

  useKeyboard((key) => {
    if (searchMode()) {
      handleSearchModeKey(key);
      return;
    }

    if (key.name === "tab") {
      setCurrentTab(cycleTab);
      if (currentTab() === "progress") {
        readProgressFile();
      }
      return;
    }

    if (currentTab() === "prd" && handlePrdTabKey(key)) {
      return;
    }

    if (key.name === "e" || key.name === "space") {
      setExpanded((prev) => !prev);
    }
    if (key.name === "r") {
      setRichMode((prev) => !prev);
    }
    if (key.name === "q" || key.name === "escape") {
      handleQuit();
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

  // Watch progress file when progress tab is active
  createEffect(() => {
    if (currentTab() !== "progress") {
      return;
    }
    readProgressFile();
    const path = progressPath();
    if (!existsSync(path)) {
      return;
    }
    const watcher = watch(path, () => {
      readProgressFile();
    });
    onCleanup(() => watcher.close());
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

  const getTodoIcon = (todoStatus: string): string => {
    switch (todoStatus) {
      case "completed":
        return "☑";
      case "in_progress":
        return "◐";
      default:
        return "☐";
    }
  };

  const getTodoColor = (todoStatus: string): string => {
    switch (todoStatus) {
      case "completed":
        return "#00ff00";
      case "in_progress":
        return "#ffff00";
      default:
        return "#888888";
    }
  };

  const formatTokens = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const formatCost = (cost: number): string => {
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(2)}`;
  };

  const hasUsageData = () =>
    props.showUsage &&
    (totalInputTokens() > 0 || totalOutputTokens() > 0 || totalCost() > 0);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: message processing requires multiple checks
  const processRichMessage = (message: RichMessage) => {
    setMessages((prev) => [...prev.slice(-OUTPUT_BUFFER_SIZE), message]);

    if (isMessage(message)) {
      const toolCalls = message.content.filter(isToolUseBlock);
      if (toolCalls.length > 0) {
        setToolCallCount((prev) => prev + toolCalls.length);
      }

      // Extract todos from TodoWrite tool calls
      for (const block of message.content) {
        if (isToolUseBlock(block)) {
          const name = block.name.toLowerCase();
          if (name === "todowrite" || name === "todo_write") {
            const items = block.input.todos;
            if (isTodoItemArray(items)) {
              setTodos(items);
            }
          }
        }
      }
    }

    if (isResultMessage(message)) {
      const result = message as ResultMessage;
      if (result.usage) {
        setTotalInputTokens((prev) => prev + result.usage!.input_tokens);
        setTotalOutputTokens((prev) => prev + result.usage!.output_tokens);
      }
      if (result.total_cost_usd !== undefined) {
        setTotalCost((prev) => prev + result.total_cost_usd!);
      }
    }
  };

  const handleChunk = (chunk: ParsedChunk) => {
    if (chunk.richMessage) {
      processRichMessage(chunk.richMessage);
    }
    if (chunk.displayText) {
      setLegacyOutput((prev) => [
        ...prev.slice(-OUTPUT_BUFFER_SIZE),
        chunk.displayText!,
      ]);
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
      setLegacyOutput((prev) => [
        ...prev,
        `[ERROR] Exit code: ${result.exitCode}`,
      ]);
      setStatus("error");
      setExitReason("error");
      return { shouldBreak: true, exitCode: result.exitCode };
    }

    if (result.complete) {
      setLegacyOutput((prev) => [...prev, "[COMPLETE] Task finished!"]);
      setStatus("complete");
      setExitReason("complete");
      return { shouldBreak: true, exitCode: result.exitCode };
    }

    setLegacyOutput((prev) => [...prev, `[OK] Iteration ${i} completed`]);
    return { shouldBreak: false, exitCode: result.exitCode };
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: loop logic is inherently complex
  const runLoop = async () => {
    setStatus("running");
    let lastExitCode = 0;
    const outputFormat = props.outputFormat || "stream-json";

    // Execute ralph_start hook
    if (hookExecutor) {
      await hookExecutor.executeRalphStart(
        props.tasksNotPassing ?? 0,
        props.maxIterations
      );
    }

    for (let i = 1; i <= props.maxIterations; i++) {
      if (ctx.aborted) {
        break;
      }

      // Reset todos for new iteration
      setTodos([]);

      // Execute ralph_loop_start hook
      if (hookExecutor) {
        await hookExecutor.executeRalphLoopStart(i);
      }

      setIteration(i);
      setTerminalTitle(`${RALPH_ICON} Ralph: ${i}/${props.maxIterations}`);
      setLegacyOutput((prev) => [
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
          handleChunk,
          logger
        );

        if (ctx.aborted) {
          break;
        }

        // Execute ralph_loop_end hook
        if (hookExecutor) {
          await hookExecutor.executeRalphLoopEnd(i);
        }

        const handled = handleIterationResult(result, i);
        lastExitCode = handled.exitCode;
        if (handled.shouldBreak) {
          // Execute appropriate completion hook
          if (hookExecutor && exitReason() === "complete") {
            await hookExecutor.executeRalphComplete(i);
          }
          break;
        }
      } catch (error) {
        setLegacyOutput((prev) => [...prev, `[ERROR] ${error}`]);
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
      // Execute ralph_max_iterations hook
      if (hookExecutor) {
        await hookExecutor.executeRalphMaxIterations(iteration());
      }
    }

    clearTerminalTitle();
    props.onComplete({
      iterations: iteration(),
      exitReason: exitReason(),
      lastExitCode,
      lastSessionId: lastSessionId(),
      totalInputTokens: totalInputTokens(),
      totalOutputTokens: totalOutputTokens(),
      totalCost: totalCost(),
      toolCallCount: toolCallCount(),
    });
    renderer.destroy();
  };

  onMount(() => {
    runLoop();
  });

  const outputCount = () =>
    richMode() ? messages().length : legacyOutput().length;
  const outputLabel = () => (richMode() ? "messages" : "lines");

  const prdHelpText = () => {
    if (searchMode()) {
      return `Search: ${searchQuery()}_ | [Enter/Esc] done`;
    }
    return "[f] filter | [/] search | [c] clear";
  };

  return (
    <box flexDirection="column" style={{ padding: 1 }}>
      {/* Tab bar - at top */}
      <box>
        <text>
          <span
            style={{
              fg: currentTab() === "output" ? "#00ff00" : "#666666",
            }}
          >
            {currentTab() === "output" ? "▶ " : "  "}
            Output
          </span>
          <span style={{ fg: "#666666" }}> | </span>
          <span
            style={{
              fg: currentTab() === "progress" ? "#00ff00" : "#666666",
            }}
          >
            {currentTab() === "progress" ? "▶ " : "  "}
            Progress
          </span>
          <span style={{ fg: "#666666" }}> | </span>
          <span
            style={{
              fg: currentTab() === "prd" ? "#00ff00" : "#666666",
            }}
          >
            {currentTab() === "prd" ? "▶ " : "  "}
            PRD
          </span>
          <Show when={currentTab() === "prd"}>
            <span style={{ fg: "#666666" }}> | {prdHelpText()}</span>
          </Show>
        </text>
      </box>

      {/* Main content area */}
      <box flexDirection="column" style={{ flexGrow: 1 }}>
        {/* Output tab view */}
        <Show when={currentTab() === "output"}>
          <Show when={expanded()}>
            <Show
              fallback={
                <scrollbox
                  stickyScroll
                  stickyStart="bottom"
                  style={{ marginTop: 1, flexGrow: 1 }}
                >
                  <For each={legacyOutput().slice(-OUTPUT_BUFFER_SIZE)}>
                    {(line) => <text>{line}</text>}
                  </For>
                </scrollbox>
              }
              when={richMode()}
            >
              <MessageList expanded={expanded()} messages={messages()} />
            </Show>
          </Show>

          <Show when={!expanded() && outputCount() > 0}>
            <box style={{ marginTop: 1 }}>
              <text>
                <span style={{ fg: "#666666" }}>
                  {outputCount()} {outputLabel()} captured. Press [e] to view.
                </span>
              </text>
            </box>
          </Show>
        </Show>

        {/* Progress tab view */}
        <Show when={currentTab() === "progress"}>
          <scrollbox
            stickyScroll
            stickyStart="bottom"
            style={{ marginTop: 1, flexGrow: 1 }}
          >
            <For each={progressContent()}>{(line) => <text>{line}</text>}</For>
          </scrollbox>
        </Show>

        {/* PRD Items tab content */}
        <Show when={currentTab() === "prd"}>
          <box style={{ marginTop: 1 }}>
            <Show
              fallback={
                <text>
                  <span style={{ fg: "#666666" }}>
                    No PRD items loaded. Make sure prd.json exists.
                  </span>
                </text>
              }
              when={prdItems().length > 0}
            >
              <PrdItemsTab
                items={prdItems()}
                passFilter={passFilter()}
                searchQuery={searchQuery()}
              />
            </Show>
          </box>
        </Show>
      </box>

      {/* Footer */}
      <box flexDirection="column" style={{ paddingTop: 1 }}>
        {/* Header line */}
        <text>
          <span style={{ fg: "#00aaff" }}>{RALPH_ICON}</span>{" "}
          <strong>Ralph Agent Loop</strong>
          <span style={{ fg: "#666666" }}>
            {" "}
            | [e] toggle | [r] {richMode() ? "plain" : "rich"} | [Tab] switch |
            [q] quit
          </span>
        </text>

        {/* Progress bar */}
        <text>
          <span style={{ fg: statusColor() }}>{statusIcon()} </span>
          Iteration {iteration()}/{props.maxIterations}{" "}
          <span style={{ fg: "#666666" }}>{progressBar()}</span>
          <Show when={hasUsageData()}>
            <span style={{ fg: "#444444" }}> | </span>
            <span style={{ fg: "#00aaff" }}>
              {formatTokens(totalInputTokens())} in /{" "}
              {formatTokens(totalOutputTokens())} out
            </span>
            <Show when={totalCost() > 0}>
              <span style={{ fg: "#ffaa00" }}>
                {" "}
                | {formatCost(totalCost())}
              </span>
            </Show>
          </Show>
        </text>

        {/* Status messages */}
        <Show when={status() === "complete" && exitReason() === "complete"}>
          <text>
            <span style={{ fg: "#00ff00" }}>
              ✓ Task marked complete by agent
            </span>
          </text>
        </Show>
        <Show
          when={status() === "complete" && exitReason() === "max_iterations"}
        >
          <text>
            <span style={{ fg: "#ffff00" }}>
              ⚠ Reached max iterations ({props.maxIterations})
            </span>
          </text>
        </Show>
        <Show when={status() === "error"}>
          <text>
            <span style={{ fg: "#ff0000" }}>
              ✗ Error in iteration {iteration()}
            </span>
          </text>
        </Show>

        {/* Tasks */}
        <Show when={todos().length > 0}>
          <For each={todos()}>
            {(todo) => (
              <text>
                <span style={{ fg: getTodoColor(todo.status) }}>
                  {getTodoIcon(todo.status)}
                </span>
                <span style={{ fg: "#aaaaaa" }}> {todo.content}</span>
              </text>
            )}
          </For>
        </Show>
      </box>
    </box>
  );
}

export function runLoopTUI(
  props: Omit<RalphAppProps, "onComplete">
): Promise<LoopResult> {
  return new Promise((res) => {
    let result: LoopResult | null = null;

    const onComplete = (r: LoopResult) => {
      result = r;
    };

    render(() => <RalphApp {...props} onComplete={onComplete} />, {
      onDestroy: () => {
        // Renderer cleanup complete, now safe to resolve
        setTimeout(() => {
          if (result) {
            res(result);
          }
        }, TUI_CLEANUP_DELAY_MS);
      },
    });
  });
}

export { RalphApp };
