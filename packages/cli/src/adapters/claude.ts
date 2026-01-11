import type { OutputFormat } from "#parsers";
import { BaseAdapter } from "./base-adapter";
import type { AdapterOptions } from "./types";

export class ClaudeAdapter extends BaseAdapter {
  readonly name = "claude";
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
}
