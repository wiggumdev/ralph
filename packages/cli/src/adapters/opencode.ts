import { AcpAdapter } from "./acp";

/**
 * OpenCode ACP adapter.
 * Uses built-in `opencode acp` command.
 */

export class OpenCodeAcpAdapter extends AcpAdapter {
  readonly name = "opencode";
  readonly command = "opencode";
  readonly args = ["acp"];
}
