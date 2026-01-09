import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

export class OpenCodeAdapter implements CLIAdapter {
  readonly name = "opencode";
  readonly completionMarker = "<promise>COMPLETE</promise>";

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["opencode", "--non-interactive"];
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
