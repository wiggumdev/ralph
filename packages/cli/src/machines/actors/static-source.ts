import { fromCallback } from "xstate";
import type { RichMessage } from "#parsers/message-types";

export interface StaticSourceInput {
  messages: RichMessage[];
}

/**
 * fromCallback actor that emits initial messages immediately then completes.
 */
export const staticSource = fromCallback<{ type: "CANCEL" }, StaticSourceInput>(
  ({ sendBack, input }) => {
    // Emit all messages immediately
    for (const message of input.messages) {
      sendBack({ type: "MESSAGE", message });
    }

    // Complete immediately
    sendBack({ type: "COMPLETE", result: { stopReason: "end_turn" } });

    return () => {};
  }
);
