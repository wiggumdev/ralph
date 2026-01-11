import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

export class OpenCodeAdapter implements CLIAdapter {
  readonly name = "opencode";
  readonly completionMarker = "<promise>COMPLETE</promise>";
  readonly supportedFormats: OutputFormat[] = ["opencode-json", "text"];

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["opencode", "run"];

    // Add format flag for JSON output
    if (options.outputFormat === "opencode-json") {
      args.push("--format", "json");
    }

    if (options.verbose) {
      args.push("--print-logs");
    }

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
