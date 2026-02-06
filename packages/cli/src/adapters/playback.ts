import type { RichMessage } from "#parsers/message-types";
import type { PermissionRequest } from "#parsers/permission-types";
import type {
  AcpAdapterOptions,
  AcpMessageHandler,
  ResumeCommand,
} from "./acp";
import { AcpAdapter } from "./acp";

export interface PlaybackConfig {
  iterations: RichMessage[][];
  speed: number;
  baseDelay: number;
  permissionRequests?: PermissionRequest[];
  schedulePermissionAt?: Record<number, number>;
}

/**
 * AcpAdapter that plays back fixture messages for dev/test.
 * Emits messages at timed intervals through the standard handler interface.
 */
export class PlaybackAdapter extends AcpAdapter {
  readonly name = "playback";
  readonly command = "playback";
  readonly args: string[] = [];

  private intervalId: Timer | null = null;
  private currentIteration = 0;
  private currentIndex = 0;
  private readonly shownPermissions = new Set<number>();
  private readonly config: PlaybackConfig;

  constructor(config: PlaybackConfig) {
    super();
    this.config = config;
  }

  getResumeCommand(_sessionId: string): ResumeCommand | null {
    return null;
  }

  override async isAvailable(): Promise<boolean> {
    return true;
  }

  override async run(
    _prompt: string,
    options: AcpAdapterOptions,
    handler: AcpMessageHandler
  ): Promise<void> {
    const delay = this.config.baseDelay / this.config.speed;
    const messages = this.config.iterations[this.currentIteration];

    if (!messages) {
      handler.onComplete({
        success: true,
        stopReason: "end_turn",
        needsMoreWork: false,
      });
      return;
    }

    return new Promise<void>((resolve) => {
      this.intervalId = setInterval(async () => {
        if (this.currentIndex >= messages.length) {
          this.clearInterval();
          this.currentIteration++;
          this.currentIndex = 0;
          handler.onComplete({
            success: true,
            stopReason: "end_turn",
            needsMoreWork:
              this.currentIteration < this.config.iterations.length,
          });
          resolve();
          return;
        }

        // Check for scheduled permission
        const schedule = this.config.schedulePermissionAt;
        const permReqs = this.config.permissionRequests;
        if (schedule && permReqs) {
          const permIdx = schedule[this.currentIndex];
          if (
            permIdx !== undefined &&
            permReqs[permIdx] &&
            !this.shownPermissions.has(this.currentIndex)
          ) {
            this.shownPermissions.add(this.currentIndex);
            const request = permReqs[permIdx]!;
            if (options.onPermissionRequest) {
              await options.onPermissionRequest(request);
            }
            return;
          }
        }

        const message = messages[this.currentIndex];
        if (message) {
          handler.onMessage(message);
        }
        this.currentIndex++;
      }, delay);
    });
  }

  override async cancel(): Promise<void> {
    this.clearInterval();
  }

  override supportsLoadSession(): boolean {
    return false;
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
