import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

export class ClaudeAdapter implements CLIAdapter {
  readonly name = "claude";
  readonly completionMarker = "<promise>COMPLETE</promise>";
  readonly supportedFormats: OutputFormat[] = ["stream-json", "text"];

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["claude", "--permission-mode", "acceptEdits"];

    if (options.outputFormat === "stream-json") {
      args.push("--output-format", "stream-json", "--verbose");
    }

    if (options.verbose) {
      args.push("--debug");
    }

    args.push("-p", prompt);
    return args;
  }

  detectCompletion(output: string): boolean {
    return output.includes(this.completionMarker);
  }

  async isAvailable(): Promise<boolean> {
    return isCommandAvailable(this.name);
  }
}
