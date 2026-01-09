import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

export class OpenCodeAdapter implements CLIAdapter {
  readonly name = "opencode";
  readonly completionMarker = "<promise>COMPLETE</promise>";
  readonly supportedFormats: OutputFormat[] = ["text"];

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["opencode", "--non-interactive"];
    if (options.model) {
      args.push("--model", options.model);
    }
    if (options.verbose) {
      args.push("--verbose");
    }
    args.push("-m", prompt);
    return args;
  }

  detectCompletion(output: string): boolean {
    return output.includes(this.completionMarker);
  }

  async isAvailable(): Promise<boolean> {
    return isCommandAvailable(this.name);
  }
}
