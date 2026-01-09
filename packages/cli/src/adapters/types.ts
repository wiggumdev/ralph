export interface AdapterOptions {
  verbose?: boolean;
  cwd?: string;
}

export interface AdapterResult {
  exitCode: number;
  complete: boolean;
}

export interface CLIAdapter {
  readonly name: string;
  readonly completionMarker: string;

  buildArgs(prompt: string, options: AdapterOptions): string[];
  detectCompletion(output: string): boolean;
  isAvailable(): Promise<boolean>;
}
