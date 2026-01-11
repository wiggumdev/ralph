import type { OutputFormat } from "#parsers";
import { BaseAdapter } from "./base-adapter";
import type { AdapterOptions } from "./types";

export class OpenCodeAdapter extends BaseAdapter {
  readonly name = "opencode";
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
}
