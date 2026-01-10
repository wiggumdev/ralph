import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

/**
 * Kilo Code CLI Adapter
 *
 * Supports the Kilo Code CLI (kilocode/kilo) for AI-powered coding tasks.
 * @see https://kilo.ai/docs/cli
 *
 * Key features:
 * - `--auto`: Autonomous mode (auto-approves operations based on config)
 * - `--json`: JSON output format (used with --auto for programmatic parsing)
 * - `--mode`: Agent mode selection (code, architect, ask, debug)
 * - `--timeout`: Timeout in seconds for autonomous operations
 *
 * Limitations vs Claude adapter:
 * - No native stream-json format (uses batch JSON via --json flag)
 * - JSON output structure differs from Claude's stream-json format
 * - No built-in session resume (uses --continue for last conversation)
 * - Completion detection relies on prompt-injected marker, not native signals
 */
export class KiloAdapter implements CLIAdapter {
  readonly name = "kilo";
  readonly completionMarker = "<promise>COMPLETE</promise>";
  // Kilo supports JSON output but it's batch, not streaming like Claude's stream-json
  // For now, we primarily support text mode which works more reliably with the TUI
  readonly supportedFormats: OutputFormat[] = ["text"];

  /**
   * Build command-line arguments for Kilo CLI execution.
   *
   * Uses --auto for non-interactive mode with auto-approval of operations.
   * The prompt is passed as a positional argument after all flags.
   */
  buildArgs(prompt: string, options: AdapterOptions): string[] {
    // Use 'kilocode' as the primary command (also available as 'kilo')
    const args = ["kilocode", "--auto"];

    // Use code mode by default for general development tasks
    args.push("--mode", "code");

    if (options.verbose) {
      // Kilo doesn't have a direct --verbose flag in auto mode
      // but we can add --debug if it becomes available
    }

    // Pass the prompt as a positional argument
    args.push(prompt);

    return args;
  }

  detectCompletion(output: string): boolean {
    return output.includes(this.completionMarker);
  }

  async isAvailable(): Promise<boolean> {
    // Try both command names - 'kilocode' is primary, 'kilo' is alias
    const kilocodeAvailable = await isCommandAvailable("kilocode");
    if (kilocodeAvailable) return true;
    return isCommandAvailable("kilo");
  }
}

/**
 * Extended Kilo adapter options for advanced configuration.
 * These can be used for future enhancements.
 */
export interface KiloAdapterOptions extends AdapterOptions {
  /** Agent mode: code, architect, ask, debug, or custom */
  mode?: "code" | "architect" | "ask" | "debug" | string;
  /** Timeout in seconds for autonomous operations */
  timeout?: number;
  /** Use JSON output format (batch, not streaming) */
  jsonOutput?: boolean;
}
