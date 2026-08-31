import { AcpAdapter, type ResumeCommand } from "./acp";

/**
 * GitHub Copilot CLI ACP adapter.
 * Uses `copilot --acp` command.
 *
 * Sets the session mode to Autopilot, which is described by the agent as
 * "Autonomous mode that enables allow-all and runs until task completion
 * without user interaction." Permission requests still arrive over ACP and
 * are handled by the base adapter's yolo/callback flow.
 */

const AUTOPILOT_MODE_ID =
  "https://agentclientprotocol.com/protocol/session-modes#autopilot";

export class CopilotAcpAdapter extends AcpAdapter {
  readonly name = "copilot";
  readonly command = "copilot";
  readonly args = ["--acp"];
  override readonly installHint = "npm install -g @github/copilot";

  getResumeCommand(sessionId: string): ResumeCommand {
    return { command: "copilot", args: [`--resume=${sessionId}`] };
  }

  protected override getPreferredModeId(): string | null {
    return AUTOPILOT_MODE_ID;
  }
}
