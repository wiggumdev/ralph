import { AcpAdapter, type ResumeCommand } from "./acp";

/**
 * Claude Code ACP adapter.
 * Uses @agentclientprotocol/claude-agent-acp for communication.
 */

export class ClaudeAcpAdapter extends AcpAdapter {
  readonly name = "claude";
  readonly command = "claude-agent-acp";
  readonly args: string[] = [];
  // `claude-code-acp` is the binary from @zed-industries/claude-code-acp,
  // which was renamed to @agentclientprotocol/claude-agent-acp and is now
  // deprecated. Keep accepting it so existing installs keep working.
  override readonly fallbackCommands = ["claude-code-acp"];
  // Note: the unscoped `claude-code-acp` package on npm is an unrelated
  // project that installs a `cc-acp` binary, so name the scoped one.
  override readonly installHint =
    "npm install -g @agentclientprotocol/claude-agent-acp";

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
