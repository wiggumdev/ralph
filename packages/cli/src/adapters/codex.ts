import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

/**
 * Adapter for OpenAI's Codex CLI (https://github.com/openai/codex)
 *
 * ## Overview
 * Codex is OpenAI's coding agent that runs in the terminal. It can inspect
 * repositories, edit files, and run commands with different approval modes.
 *
 * ## Feature Parity with Claude Adapter
 *
 * ### ✅ SUPPORTED FEATURES (Full Parity)
 * - Non-interactive/batch mode execution (`codex exec`)
 * - Auto-approval of edits within workspace (`--full-auto`)
 * - Working directory configuration (`--cd`)
 * - Availability detection via `which codex`
 * - Text output streaming (compatible with TextParser)
 * - Completion marker detection for iteration loops
 *
 * ### ⚠️ PARTIAL SUPPORT (Functional Gaps)
 * - **Structured JSON streaming**: Codex supports `--json` for JSONL event
 *   streaming, but the format differs from Claude's stream-json format.
 *   A dedicated CodexJsonParser would be needed to fully support rich TUI
 *   features (tool use blocks, progress indicators, etc.)
 *   - Codex JSONL events: thread.started, turn.started, turn.completed,
 *     turn.failed, item.*, error
 *   - Claude stream-json: message, content_block, tool_use, tool_result, etc.
 *
 * ### ❌ NOT SUPPORTED / GAPS
 * - **Rich TUI content blocks**: Without JSONL parser, no tool_use/tool_result
 *   visualization in the TUI (displays as plain text instead)
 * - **Session resumption**: Codex supports `codex exec resume --last` but
 *   this is not yet integrated with Ralph's session tracking
 * - **Verbose/debug flags**: Codex doesn't have equivalent --debug flag
 * - **MCP server integration**: Codex has its own MCP config in ~/.codex/config.toml
 *   which is separate from Ralph's configuration
 *
 * ## Codex CLI Reference
 *
 * ### Approval Modes (--ask-for-approval)
 * - `untrusted`: Ask for everything
 * - `on-failure`: Ask only after command failures
 * - `on-request`: Ask for network/external writes (default in --full-auto)
 * - `never`: No approvals (dangerous)
 *
 * ### Sandbox Modes (--sandbox)
 * - `read-only`: No edits or commands
 * - `workspace-write`: Edits in workspace only (default in --full-auto)
 * - `danger-full-access`: Full system access
 *
 * ### Output Options
 * - Default: Progress to stderr, final result to stdout
 * - `--json`: JSONL event stream to stdout
 *
 * @see https://developers.openai.com/codex/cli/reference/
 * @see https://developers.openai.com/codex/noninteractive
 */
export class CodexAdapter implements CLIAdapter {
  readonly name = "codex";

  // Codex uses turn.completed event in JSONL, or we can use same marker for text mode
  readonly completionMarker = "<promise>COMPLETE</promise>";

  // Currently only text mode is fully supported
  // JSONL parsing would require a dedicated parser for Codex event format
  readonly supportedFormats: OutputFormat[] = ["text"];

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    // Use 'exec' subcommand for non-interactive mode
    const args = ["codex", "exec"];

    // --full-auto: auto-approve edits and commands within workspace
    // Equivalent to: --ask-for-approval on-request --sandbox workspace-write
    args.push("--full-auto");

    // Set working directory if provided
    if (options.cwd) {
      args.push("--cd", options.cwd);
    }

    // Note: --json flag outputs JSONL events but requires custom parser
    // For now, we use text mode which is compatible with TextParser
    // if (options.outputFormat === "stream-json") {
    //   args.push("--json");
    // }

    // Prompt is passed as positional argument
    args.push(prompt);

    return args;
  }

  detectCompletion(output: string): boolean {
    return output.includes(this.completionMarker);
  }

  async isAvailable(): Promise<boolean> {
    return isCommandAvailable(this.name);
  }
}
