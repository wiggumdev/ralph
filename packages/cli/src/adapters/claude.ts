import { AcpAdapter, type ResumeCommand } from "./acp";

/**
 * Claude Code ACP adapter.
 * Uses @zed-industries/claude-code-acp for communication.
 */

export class ClaudeAcpAdapter extends AcpAdapter {
  readonly name = "claude";
  readonly command = "claude-code-acp";
  readonly args: string[] = [];
  // Note: the unscoped `claude-code-acp` package on npm is a different
  // project and installs a `cc-acp` binary, so name the scoped one.
  override readonly installHint =
    "npm install -g @zed-industries/claude-code-acp";

  getResumeCommand(sessionId: string): ResumeCommand {
    return { command: "claude", args: ["--resume", sessionId] };
  }

  protected override getPreferredModeId(): string | null {
    return "acceptEdits";
  }

  override extractToolName(
    _meta: Record<string, unknown> | undefined
  ): string | null {
    const claudeCode = _meta?.claudeCode as { toolName?: string } | undefined;
    return claudeCode?.toolName ?? null;
  }
}
