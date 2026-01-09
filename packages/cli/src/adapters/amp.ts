import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

/**
 * Adapter for Sourcegraph Amp CLI (https://ampcode.com)
 *
 * Amp CLI supports Claude Code compatible stream-json output format via the
 * --stream-json flag, providing full feature parity for message parsing.
 *
 * Key differences from Claude CLI:
 * - Uses --execute/-x flag for non-interactive mode (vs -p for Claude)
 * - Uses --dangerously-allow-all for permission bypass (vs --permission-mode for Claude)
 * - Uses "threads" instead of "sessions" for conversation management
 * - Has built-in subagents: Librarian (codebase analysis), Oracle (expert advice), Smart (primary)
 *
 * Thread management (not directly supported in this adapter):
 * - amp threads new/continue/fork/list/share/compact
 *
 * @see https://ampcode.com/manual for full documentation
 */
export class AmpAdapter implements CLIAdapter {
  readonly name = "amp";

  /**
   * Amp uses the same stream-json format as Claude Code, so we use the same
   * completion marker. The result message with type "result" indicates completion.
   */
  readonly completionMarker = "<promise>COMPLETE</promise>";

  /**
   * Amp supports Claude Code compatible stream-json format via --stream-json flag.
   * Text mode works with --execute flag for simple output.
   */
  readonly supportedFormats: OutputFormat[] = ["stream-json", "text"];

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["amp"];

    // Execute mode is required for non-interactive CLI usage
    args.push("--execute");

    // Enable permission bypass for automated operation (equivalent to Claude's acceptEdits)
    // Note: In production, you may want to configure this via amp permissions instead
    args.push("--dangerously-allow-all");

    // Enable stream-json output for rich message parsing
    if (options.outputFormat === "stream-json") {
      args.push("--stream-json");
    }

    // Map verbose flag to debug log level
    if (options.verbose) {
      args.push("--log-level", "debug");
    }

    // Disable sound notifications in CLI mode
    args.push("--no-notifications");

    // The prompt is passed as the execute message argument
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
