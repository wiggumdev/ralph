import {
  ClientSideConnection,
  type InitializeResponse,
  type NewSessionResponse,
  ndJsonStream,
  PROTOCOL_VERSION,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { type Subprocess, spawn } from "bun";
import { Log } from "#log";
import type { RichMessage, SystemMessage } from "#parsers/message-types";
import type {
  PermissionRequest,
  PermissionResponse,
} from "#parsers/permission-types";
import { formatPermissionName } from "#utils/permission-formatter";
import { mapUpdateToRichMessage } from "./acp/message-mapper";

const log = Log.create({ service: "acp" });

export interface AcpAdapterOptions {
  cwd?: string;
  verbose?: boolean;
  yolo?: boolean;
  onPermissionRequest?: (req: PermissionRequest) => Promise<PermissionResponse>;
  onPermissionTracked?: (name: string, status: "allowed" | "denied") => void;
}

export interface AcpCompletionResult {
  sessionId?: string;
  success: boolean;
  stopReason: string;
  needsMoreWork: boolean;
}

export interface AcpMessageHandler {
  onMessage(message: RichMessage): void;
  onComplete(result: AcpCompletionResult): void;
  onError(error: Error): void;
}

/**
 * Base class for ACP-based adapters.
 * Handles JSON-RPC communication with ACP-compatible agents.
 */
export interface ResumeCommand {
  command: string;
  args: string[];
}

export abstract class AcpAdapter {
  abstract readonly name: string;
  abstract readonly command: string;
  abstract readonly args: string[];

  /**
   * Get the command to resume a session in the native CLI.
   * Returns null if the adapter doesn't support session resume.
   */
  abstract getResumeCommand(sessionId: string): ResumeCommand | null;

  private process?: Subprocess;
  private connection?: ClientSideConnection;
  private sessionId?: string;
  private handler?: AcpMessageHandler;
  private paused = false;
  private stopped = false;
  private currentOptions?: AcpAdapterOptions;
  private readonly permissionCache = new Map<string, string>();

  /**
   * Check if the adapter command is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const which = spawn(["which", this.command], { stdout: "pipe" });
      await which.exited;
      return which.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Start an ACP session and send a prompt.
   */
  async run(
    prompt: string,
    options: AcpAdapterOptions,
    handler: AcpMessageHandler
  ): Promise<void> {
    this.handler = handler;
    this.currentOptions = options;

    try {
      // Spawn the ACP subprocess
      this.process = spawn([this.command, ...this.args], {
        cwd: options.cwd,
        stdin: "pipe",
        stdout: "pipe",
        stderr: options.verbose ? "inherit" : "pipe",
      });

      // Get Bun process streams
      const bunStdin = this.process.stdin;
      const bunStdout = this.process.stdout;

      if (
        !(bunStdin && bunStdout) ||
        typeof bunStdin === "number" ||
        typeof bunStdout === "number"
      ) {
        throw new Error("Failed to get process streams");
      }

      // Wrap Bun's FileSink stdin into a standard WritableStream
      const writableStream = new WritableStream<Uint8Array>({
        write(chunk) {
          bunStdin.write(chunk);
        },
        close() {
          bunStdin.end();
        },
      });

      // Wrap Bun's stdout ReadableStream (already compatible)
      const readableStream = bunStdout as unknown as ReadableStream<Uint8Array>;

      // Create JSON-RPC stream
      // ndJsonStream(output, input) - output is writable, input is readable
      const stream = ndJsonStream(writableStream, readableStream);

      // Create client-side connection
      this.connection = new ClientSideConnection(
        () => ({
          sessionUpdate: this.handleSessionUpdate.bind(this),
          requestPermission: this.handleRequestPermission.bind(this),
        }),
        stream
      );

      // Initialize the connection
      let initResponse: InitializeResponse;
      try {
        initResponse = await this.connection.initialize({
          clientInfo: { name: "ralph", version: "0.1.0" },
          protocolVersion: PROTOCOL_VERSION,
        });
      } catch (initError) {
        throw new Error(
          `ACP initialize failed: ${this.formatError(initError)}`
        );
      }

      // Emit system message with agent info
      const agentName = initResponse.agentInfo?.name;
      this.emitSystemMessage(agentName);

      // Create new session
      let sessionResponse: NewSessionResponse;
      try {
        sessionResponse = await this.connection.newSession({
          cwd: options.cwd || process.cwd(),
          mcpServers: [],
        });
      } catch (sessionError) {
        throw new Error(
          `ACP newSession failed: ${this.formatError(sessionError)}`
        );
      }
      this.sessionId = sessionResponse.sessionId;

      // Log available modes for discovery
      if (sessionResponse.modes) {
        log.debug("Available modes", {
          modes: sessionResponse.modes,
        });
      }

      // Set preferred mode if different from current
      const preferredMode = this.getPreferredModeId();
      if (
        preferredMode &&
        sessionResponse.modes?.currentModeId !== preferredMode
      ) {
        await this.connection.setSessionMode({
          sessionId: this.sessionId,
          modeId: preferredMode,
        });
      }

      // Send the prompt as ContentBlock array
      let promptResponse: PromptResponse;
      try {
        promptResponse = await this.connection.prompt({
          sessionId: this.sessionId,
          prompt: [{ type: "text", text: prompt }],
        });
      } catch (promptError) {
        throw new Error(`ACP prompt failed: ${this.formatError(promptError)}`);
      }

      // Handle completion
      const stopReason = promptResponse.stopReason ?? "end_turn";
      const needsMoreWork = stopReason !== "end_turn";
      handler.onComplete({
        sessionId: this.sessionId,
        success: !needsMoreWork,
        stopReason,
        needsMoreWork,
      });
    } catch (error) {
      handler.onError(this.toError(error));
    } finally {
      if (!this.paused) {
        await this.cleanup();
      }
    }
  }

  /**
   * Cancel the current session.
   */
  async cancel(): Promise<void> {
    if (this.connection && this.sessionId) {
      await this.connection.cancel({ sessionId: this.sessionId });
    }
    await this.cleanup();
  }

  /**
   * Pause the current session using ACP cancel notification.
   */
  async pause(): Promise<void> {
    if (!(this.connection && this.sessionId) || this.paused || this.stopped) {
      return;
    }
    log.debug("pause", { sessionId: this.sessionId });
    this.paused = true;
    // Use ACP cancel notification instead of SIGSTOP
    await this.connection.cancel({ sessionId: this.sessionId });
  }

  /**
   * Resume a paused session.
   * Note: After cancel, agent returns StopReason::Cancelled.
   * Resume will start fresh iteration via AcpStateProvider.
   */
  resume(): void {
    if (!this.paused || this.stopped) {
      return;
    }
    log.debug("resume", { sessionId: this.sessionId });
    this.paused = false;
  }

  /**
   * Continue a paused session with a new prompt.
   */
  async continueSession(handler: AcpMessageHandler): Promise<void> {
    if (!(this.connection && this.sessionId && this.paused)) {
      return;
    }
    this.handler = handler;
    this.paused = false;

    try {
      const promptResponse = await this.connection.prompt({
        sessionId: this.sessionId,
        prompt: [{ type: "text", text: "Continue" }],
      });

      const stopReason = promptResponse.stopReason ?? "end_turn";
      const needsMoreWork = stopReason !== "end_turn";
      handler.onComplete({
        sessionId: this.sessionId,
        success: !needsMoreWork,
        stopReason,
        needsMoreWork,
      });
    } catch (error) {
      handler.onError(this.toError(error));
    } finally {
      if (!this.paused) {
        await this.cleanup();
      }
    }
  }

  /**
   * Stop the current session completely.
   */
  async stop(): Promise<void> {
    if (!this.process || this.stopped) {
      return;
    }
    this.stopped = true;
    this.paused = false;
    await this.cancel();
  }

  /**
   * Check if session is currently paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Check if session has been stopped.
   */
  isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Get the preferred mode ID for the session.
   * Override in subclasses to set a specific mode.
   */
  protected getPreferredModeId(): string | null {
    return null;
  }

  private async cleanup(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
    this.connection = undefined;
  }

  /**
   * Handle session update notifications from the agent.
   */
  private async handleSessionUpdate(
    params: SessionNotification
  ): Promise<void> {
    log.debug("ACP IN", { update: params.update });
    const message = mapUpdateToRichMessage(params.update);
    if (message) {
      this.handler?.onMessage(message);
    }
  }

  /**
   * Handle permission requests from the agent.
   * Delegates to onPermissionRequest callback or auto-approves in yolo mode.
   */
  private async handleRequestPermission(
    params: RequestPermissionRequest
  ): Promise<RequestPermissionResponse> {
    log.debug("permission_request", { params });
    const options = this.currentOptions;
    const formattedName = formatPermissionName(params.toolCall);

    // Find first allow option for yolo/cache
    const firstAllowOption = params.options.find(
      (o) => o.kind === "allow_once" || o.kind === "allow_always"
    );

    // Yolo mode: auto-approve
    if (options?.yolo && firstAllowOption) {
      options.onPermissionTracked?.(formattedName, "allowed");
      const response = {
        outcome: { outcome: "selected", optionId: firstAllowOption.optionId },
      } as const;
      log.debug("permission_response", { response, mode: "yolo" });
      return response;
    }

    // Check cache for allow_always
    const cacheKey = params.toolCall.title ?? params.toolCall.toolCallId;
    const cachedOptionId = this.permissionCache.get(cacheKey);
    if (cachedOptionId) {
      options?.onPermissionTracked?.(formattedName, "allowed");
      const response = {
        outcome: { outcome: "selected", optionId: cachedOptionId },
      } as const;
      log.debug("permission_response", { response, mode: "cached" });
      return response;
    }

    // Delegate to callback if provided (tracking handled by callback wrapper)
    if (options?.onPermissionRequest) {
      const request: PermissionRequest = {
        id: crypto.randomUUID(),
        sessionId: params.sessionId,
        toolCall: params.toolCall,
        options: params.options,
        timestamp: Date.now(),
      };

      const callbackResponse = await options.onPermissionRequest(request);

      if (
        callbackResponse.outcome === "selected" &&
        callbackResponse.optionId
      ) {
        // Cache allow_always selections
        const selectedOption = params.options.find(
          (o) => o.optionId === callbackResponse.optionId
        );
        if (selectedOption?.kind === "allow_always") {
          this.permissionCache.set(cacheKey, callbackResponse.optionId);
        }
        const response = {
          outcome: { outcome: "selected", optionId: callbackResponse.optionId },
        } as const;
        log.debug("permission_response", { response, mode: "callback" });
        return response;
      }
      log.debug("permission_response", {
        outcome: "cancelled",
        mode: "callback",
      });
      return { outcome: { outcome: "cancelled" } };
    }

    // Fallback: auto-approve first allow option
    if (firstAllowOption) {
      options?.onPermissionTracked?.(formattedName, "allowed");
      const response = {
        outcome: { outcome: "selected", optionId: firstAllowOption.optionId },
      } as const;
      log.debug("permission_response", { response, mode: "fallback" });
      return response;
    }

    options?.onPermissionTracked?.(formattedName, "denied");
    log.debug("permission_response", {
      outcome: "cancelled",
      mode: "no_options",
    });
    return { outcome: { outcome: "cancelled" } };
  }

  /**
   * Emit a system message with initialization info.
   */
  private emitSystemMessage(name?: string): void {
    const systemMessage: SystemMessage = {
      type: "system",
      subtype: "init",
      model: name,
      timestamp: Date.now(),
    };
    this.handler?.onMessage(systemMessage);
  }

  /**
   * Format an error-like object with code/message/data to string.
   */
  private formatErrorObject(obj: Record<string, unknown>): string | null {
    if (!("message" in obj) || typeof obj.message !== "string") {
      return null;
    }
    const parts = [obj.message];
    if ("code" in obj && typeof obj.code === "number") {
      parts.push(`(code: ${obj.code})`);
    }
    if ("data" in obj && obj.data) {
      parts.push(`data: ${JSON.stringify(obj.data)}`);
    }
    return parts.join(" ");
  }

  /**
   * Format unknown error to string for error messages.
   * Handles JSON-RPC errors which have code/message/data structure.
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      const cause = (error as Error & { cause?: unknown }).cause;
      if (cause && typeof cause === "object") {
        return this.formatError(cause);
      }
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object") {
      const errObj = error as Record<string, unknown>;
      // Handle nested JSON-RPC error: { error: { code, message, data } }
      if (
        "error" in errObj &&
        errObj.error &&
        typeof errObj.error === "object"
      ) {
        const nested = this.formatErrorObject(
          errObj.error as Record<string, unknown>
        );
        if (nested) {
          return nested;
        }
      }
      // Handle direct error object: { code, message, data }
      const direct = this.formatErrorObject(errObj);
      if (direct) {
        return direct;
      }
      // Fallback to JSON
      try {
        return JSON.stringify(error);
      } catch {
        return "Unknown error object";
      }
    }
    return String(error);
  }

  /**
   * Convert unknown error to Error object with meaningful message.
   */
  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === "string") {
      return new Error(error);
    }
    if (error && typeof error === "object") {
      // Handle objects with message property
      if ("message" in error && typeof error.message === "string") {
        return new Error(error.message);
      }
      // Try JSON stringify for other objects
      try {
        return new Error(JSON.stringify(error));
      } catch {
        return new Error("Unknown error object");
      }
    }
    return new Error(String(error));
  }
}
