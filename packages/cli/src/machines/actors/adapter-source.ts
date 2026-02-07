import { fromCallback } from "xstate";
import type {
  AcpAdapter,
  AcpAdapterOptions,
  AcpCompletionResult,
  AcpMessageHandler,
} from "#adapters/acp";
import { Log } from "#log";
import type { RichMessage } from "#parsers/message-types";
import type {
  PermissionRequest,
  PermissionResponse,
} from "#parsers/permission-types";

const log = Log.create({ service: "adapter-source" });

export interface AdapterSourceInput {
  adapter: AcpAdapter;
  prompt: string;
  options: AcpAdapterOptions;
}

export type AdapterSourceEvent =
  | { type: "MESSAGE"; message: RichMessage }
  | { type: "COMPLETE"; result: { stopReason: string } }
  | { type: "ERROR"; error: Error }
  | {
      type: "PERMISSION_REQUEST";
      request: PermissionRequest;
      resolve: (response: PermissionResponse) => void;
    };

/**
 * fromCallback actor wrapping AcpAdapter.run().
 * Sends MESSAGE/COMPLETE/ERROR/PERMISSION_REQUEST events to parent.
 * Cleanup cancels the adapter.
 */
export const adapterSource = fromCallback<
  { type: "CANCEL" },
  AdapterSourceInput
>(({ sendBack, input }) => {
  log.debug("actor_started", { adapter: input.adapter.name });

  const handler: AcpMessageHandler = {
    onMessage: (message: RichMessage) => {
      log.debug("on_message", { type: message.type });
      sendBack({ type: "MESSAGE", message });
    },
    onComplete: (result: AcpCompletionResult) => {
      log.debug("on_complete", { stopReason: result.stopReason });
      sendBack({ type: "COMPLETE", result: { stopReason: result.stopReason } });
    },
    onError: (error: Error) => {
      log.error("on_error", { error: error.message });
      sendBack({ type: "ERROR", error });
    },
  };

  const adapterOptions: AcpAdapterOptions = {
    ...input.options,
    onPermissionRequest: (req: PermissionRequest) =>
      new Promise<PermissionResponse>((resolve) => {
        sendBack({ type: "PERMISSION_REQUEST", request: req, resolve });
      }),
  };

  log.debug("adapter_run_calling", { prompt: input.prompt.slice(0, 80) });
  input.adapter.run(input.prompt, adapterOptions, handler).catch((err) => {
    log.error("adapter_run_rejected", {
      error: err instanceof Error ? err.message : String(err),
    });
    sendBack({
      type: "ERROR",
      error: err instanceof Error ? err : new Error(String(err)),
    });
  });

  return () => {
    log.debug("cleanup_invoked");
    input.adapter.cancel().catch(() => {
      // Ignore cancel errors during cleanup
    });
  };
});
