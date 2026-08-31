import { AcpAdapter, type ResumeCommand } from "./acp";

/**
 * Gemini ACP adapter.
 * Uses `gemini --experimental-acp` command.
 */

export class GeminiAcpAdapter extends AcpAdapter {
  readonly name = "gemini";
  readonly command = "gemini";
  readonly args = ["--experimental-acp"];
  override readonly installHint = "npm install -g @google/gemini-cli";

  getResumeCommand(_sessionId: string): ResumeCommand | null {
    return null; // Gemini doesn't support session resume
  }
}
