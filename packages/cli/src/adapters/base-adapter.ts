import type { OutputFormat } from "#parsers";
import { isCommandAvailable } from "#utils/stream";
import type { AdapterOptions, CLIAdapter } from "./types";

/**
 * Base adapter class that provides common functionality for all CLI adapters.
 * Concrete adapters should extend this class and implement the abstract methods.
 */
export abstract class BaseAdapter implements CLIAdapter {
  abstract readonly name: string;
  abstract readonly supportedFormats: OutputFormat[];

  readonly completionMarker = "<promise>COMPLETE</promise>";

  /**
   * Build command-line arguments for the adapter.
   * This method must be implemented by concrete adapters.
   */
  abstract buildArgs(prompt: string, options: AdapterOptions): string[];

  /**
   * Detect if the output contains the completion marker.
   */
  detectCompletion(output: string): boolean {
    return output.includes(this.completionMarker);
  }

  /**
   * Check if the adapter command is available on the system.
   */
  async isAvailable(): Promise<boolean> {
    return isCommandAvailable(this.name);
  }
}
