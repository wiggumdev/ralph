import { AcpAdapter, type ResumeCommand } from "./acp";

/**
 * OpenCode ACP adapter.
 * Uses built-in `opencode acp` command.
 */

export class OpenCodeAcpAdapter extends AcpAdapter {
  readonly name = "opencode";
  readonly command = "opencode";
  readonly args = ["acp"];

  getResumeCommand(sessionId: string): ResumeCommand {
    return { command: "opencode", args: ["--session", sessionId] };
  }
}
