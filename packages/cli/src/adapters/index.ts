import type { AdapterType } from "#config/schema";
import { ClaudeAdapter } from "./claude";
import { CodexAdapter } from "./codex";
import { OpenCodeAdapter } from "./opencode";
import type { CLIAdapter } from "./types";

const adapters: Record<AdapterType, () => CLIAdapter> = {
  claude: () => new ClaudeAdapter(),
  codex: () => new CodexAdapter(),
  opencode: () => new OpenCodeAdapter(),
};

export function getAdapter(type: AdapterType): CLIAdapter {
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unknown adapter type: ${type}`);
  }
  return factory();
}
