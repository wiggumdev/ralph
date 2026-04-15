import type { AdapterType } from "#config/schema";
import type { AcpAdapter } from "./acp";
import { ClaudeAcpAdapter } from "./claude";
import { GeminiAcpAdapter } from "./gemini";
import { OpenCodeAcpAdapter } from "./opencode";

const adapters: Record<AdapterType, () => AcpAdapter> = {
  claude: () => new ClaudeAcpAdapter(),
  opencode: () => new OpenCodeAcpAdapter(),
  gemini: () => new GeminiAcpAdapter(),
};

export function getAdapter(type: AdapterType): AcpAdapter {
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unknown adapter type: ${type}`);
  }
  return factory();
}
