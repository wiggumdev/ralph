import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

export class ClaudeAdapter implements CLIAdapter {
  readonly name = "claude";
  readonly completionMarker = "<promise>COMPLETE</promise>";

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["claude", "--permission-mode", "acceptEdits"];
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
