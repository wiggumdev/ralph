import type { OutputFormat } from "#parsers";

export interface AdapterOptions {
  verbose?: boolean;
  cwd?: string;
  outputFormat?: OutputFormat;
}

export interface AdapterResult {
  exitCode: number;
  complete: boolean;
  sessionId?: string;
}

export interface CLIAdapter {
  readonly name: string;
  readonly completionMarker: string;
  readonly supportedFormats: OutputFormat[];

  buildArgs(prompt: string, options: AdapterOptions): string[];
  detectCompletion(output: string): boolean;
  isAvailable(): Promise<boolean>;
}
