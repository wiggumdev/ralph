import { fromCallback } from "xstate";
import type { RichMessage } from "#parsers/message-types";
import type {
  PermissionRequest,
  PermissionResponse,
} from "#parsers/permission-types";

export interface PlaybackSourceInput {
  /** Message sequences per iteration (array of arrays) */
  iterations: RichMessage[][];
  /** Playback speed multiplier (1.0 = realtime, 2.0 = 2x speed) */
  speed: number;
  /** Base delay between messages in ms */
  baseDelay: number;
  /** Permission requests to simulate */
  permissionRequests?: PermissionRequest[];
  /** Map message index -> permission request index */
  schedulePermissionAt?: Record<number, number>;
}

export type PlaybackSourceEvent =
  | { type: "MESSAGE"; message: RichMessage }
  | { type: "COMPLETE"; result: { stopReason: string } }
  | { type: "ERROR"; error: Error }
  | {
      type: "PERMISSION_REQUEST";
      request: PermissionRequest;
      resolve: (response: PermissionResponse) => void;
    };

/**
 * fromCallback actor for timer-based message playback.
 * Emits MESSAGE events at intervals, COMPLETE when done.
 */
export const playbackSource = fromCallback<
  { type: "CANCEL" },
  PlaybackSourceInput
>(({ sendBack, input }) => {
  let currentIteration = 0;
  let currentIndex = 0;
  const shownPermissions = new Set<number>();
  let pendingPermissionResolve: (() => void) | null = null;

  const delay = input.baseDelay / input.speed;

  const tick = () => {
    if (pendingPermissionResolve) {
      return;
    }

    const messages = input.iterations[currentIteration];
    if (!messages || currentIndex >= messages.length) {
      // Current iteration complete, move to next
      currentIteration++;
      if (currentIteration < input.iterations.length) {
        currentIndex = 0;
        return;
      }
      // All iterations done
      sendBack({ type: "COMPLETE", result: { stopReason: "end_turn" } });
      clearInterval(intervalId);
      return;
    }

    // Check for scheduled permission
    const schedule = input.schedulePermissionAt;
    const permissionRequests = input.permissionRequests;
    if (schedule && permissionRequests) {
      const permIdx = schedule[currentIndex];
      if (
        permIdx !== undefined &&
        permissionRequests[permIdx] &&
        !shownPermissions.has(currentIndex)
      ) {
        shownPermissions.add(currentIndex);
        const request = permissionRequests[permIdx]!;
        sendBack({
          type: "PERMISSION_REQUEST",
          request,
          resolve: () => {
            pendingPermissionResolve = null;
          },
        });
        pendingPermissionResolve = () => {};
        return;
      }
    }

    const message = messages[currentIndex];
    if (message) {
      sendBack({ type: "MESSAGE", message });
    }
    currentIndex++;
  };

  const intervalId = setInterval(tick, delay);

  return () => {
    clearInterval(intervalId);
  };
});
