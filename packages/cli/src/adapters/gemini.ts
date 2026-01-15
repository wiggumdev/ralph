import { AcpAdapter } from "./acp";

/**
 * Gemini ACP adapter.
 * Uses `gemini --experimental-acp` command.
 */

export class GeminiAcpAdapter extends AcpAdapter {
  readonly name = "gemini";
  readonly command = "gemini";
  readonly args = ["--experimental-acp"];
}
