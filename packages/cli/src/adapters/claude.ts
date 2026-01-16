import { AcpAdapter, type ResumeCommand } from "./acp";

/**
 * Claude Code ACP adapter.
 * Uses @zed-industries/claude-code-acp for communication.
 */

export class ClaudeAcpAdapter extends AcpAdapter {
  readonly name = "claude";
  readonly command = "claude-code-acp";
  readonly args: string[] = [];

  getResumeCommand(sessionId: string): ResumeCommand {
    return { command: "claude", args: ["--resume", sessionId] };
  }
}
