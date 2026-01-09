import type { AdapterType } from "#config/schema";
import { ClaudeAdapter } from "./claude";
import { GeminiAdapter } from "./gemini";
import { OpenCodeAdapter } from "./opencode";
import type { CLIAdapter } from "./types";

const adapters: Record<AdapterType, () => CLIAdapter> = {
  claude: () => new ClaudeAdapter(),
  gemini: () => new GeminiAdapter(),
  opencode: () => new OpenCodeAdapter(),
};

export function getAdapter(type: AdapterType): CLIAdapter {
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unknown adapter type: ${type}`);
  }
  return factory();
}
