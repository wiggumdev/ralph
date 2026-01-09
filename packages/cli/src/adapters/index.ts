import type { AdapterType } from "#config/schema";
import { AmpAdapter } from "./amp";
import { ClaudeAdapter } from "./claude";
import { OpenCodeAdapter } from "./opencode";
import type { CLIAdapter } from "./types";

const adapters: Record<AdapterType, () => CLIAdapter> = {
  amp: () => new AmpAdapter(),
  claude: () => new ClaudeAdapter(),
  opencode: () => new OpenCodeAdapter(),
};

export function getAdapter(type: AdapterType): CLIAdapter {
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unknown adapter type: ${type}`);
  }
  return factory();
}
