import type { OutputFormat } from "#parsers";
import { BaseAdapter } from "./base-adapter";
import type { AdapterOptions } from "./types";

export class GeminiAdapter extends BaseAdapter {
  readonly name = "gemini";
  readonly supportedFormats: OutputFormat[] = ["stream-json", "text"];

  buildArgs(prompt: string, options: AdapterOptions): string[] {
    const args = ["gemini", "--approval-mode", "yolo"];

    if (options.outputFormat === "stream-json") {
      args.push("--output-format", "stream-json");
    }

    if (options.verbose) {
      args.push("--debug");
    }

    args.push("-p", prompt);
    return args;
  }
}
