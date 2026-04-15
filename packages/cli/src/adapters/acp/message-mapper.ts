/**
 * Message mapping functions for converting ACP protocol types to internal RichMessage types.
 * Extracted from AcpAdapter for better testability and separation of concerns.
 */
import type {
  ContentChunk,
  CurrentModeUpdate,
  Plan,
  SessionUpdate,
  ToolCall,
  ToolCallContent,
  ToolCallStatus,
  ToolCallUpdate,
  ToolKind,
} from "@agentclientprotocol/sdk";
import { Log } from "#log";
import type {
  AudioBlock,
  EmbeddedResourceBlock,
  ImageBlock,
  ContentBlock as InternalContentBlock,
  Message,
  PlanMessage,
  ResourceLinkBlock,
  RichMessage,
  SystemMessage,
  ThinkingDelta,
} from "#parsers/message-types";

const log = Log.create({ service: "acp-mapper" });

/**
 * Function type for extracting adapter-specific tool names from _meta.
 */
export type ToolNameExtractor = (
  _meta: Record<string, unknown> | undefined
) => string | null;

/**
 * Log _meta for session update types when present.
 */
function logMeta(
  updateType: string,
  id: string | undefined,
  meta: unknown
): void {
  if (meta) {
    log.debug(`${updateType} _meta`, { id, meta });
  }
}

/**
 * Create a Message with content blocks.
 */
function createContentMessage(
  content: InternalContentBlock[],
  timestamp: number
): Message {
  return {
    type: "message",
    role: "assistant",
    content,
    timestamp,
  };
}

/**
 * Map a resource block from ACP to internal EmbeddedResourceBlock.
 */
function mapResourceBlock(
  contentBlock: Record<string, unknown>
): EmbeddedResourceBlock {
  const res = contentBlock.resource as {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
  return {
    type: "resource",
    resource:
      "text" in res
        ? {
            type: "text",
            uri: res.uri,
            text: res.text!,
            mimeType: res.mimeType ?? undefined,
          }
        : {
            type: "blob",
            uri: res.uri,
            blob: res.blob!,
            mimeType: res.mimeType ?? undefined,
          },
  };
}

/**
 * Map a resource link block from ACP to internal ResourceLinkBlock.
 */
function mapResourceLinkBlock(
  contentBlock: Record<string, unknown>
): ResourceLinkBlock {
  return {
    type: "resource_link",
    name: contentBlock.name as string,
    uri: contentBlock.uri as string,
    description: (contentBlock.description as string) ?? undefined,
    mimeType: (contentBlock.mimeType as string) ?? undefined,
    size: contentBlock.size ? Number(contentBlock.size) : undefined,
    title: (contentBlock.title as string) ?? undefined,
  };
}

/**
 * Map an ACP SDK ContentBlock to internal ContentBlock.
 * Returns "text" for text content (accumulated separately) or null for unhandled types.
 */
function mapAcpContentBlock(
  contentBlock: { type: string } & Record<string, unknown>
): InternalContentBlock | "text" | null {
  switch (contentBlock.type) {
    case "text":
      return "text";
    case "image":
      return {
        type: "image",
        data: contentBlock.data as string,
        mimeType: contentBlock.mimeType as string,
        uri: (contentBlock.uri as string) ?? undefined,
      };
    case "audio":
      return {
        type: "audio",
        data: contentBlock.data as string,
        mimeType: contentBlock.mimeType as string,
      };
    case "resource":
      return mapResourceBlock(contentBlock);
    case "resource_link":
      return mapResourceLinkBlock(contentBlock);
    default:
      log.warn("Unhandled content block type in tool result", {
        type: contentBlock.type,
      });
      return null;
  }
}

/**
 * Extract content blocks from ToolCallContent array.
 * Handles text content as tool_result, diff as DiffBlock, and terminal as TerminalBlock.
 */
export function extractToolContentBlocks(
  content: ToolCallContent[],
  toolCallId: string,
  isError: boolean
): InternalContentBlock[] {
  const blocks: InternalContentBlock[] = [];
  const textParts: string[] = [];

  const flushTextParts = () => {
    if (textParts.length > 0) {
      blocks.push({
        type: "tool_result",
        tool_use_id: toolCallId,
        content: textParts.join("\n"),
        is_error: isError,
      });
      textParts.length = 0;
    }
  };

  for (const item of content) {
    if (item.type === "content") {
      const contentItem = item as {
        content: { type: string; text?: string };
      };
      const mapped = mapAcpContentBlock(
        contentItem.content as { type: string } & Record<string, unknown>
      );
      if (mapped === "text") {
        textParts.push(contentItem.content.text!);
      } else if (mapped) {
        flushTextParts();
        blocks.push(mapped);
      }
    } else if (item.type === "diff") {
      flushTextParts();
      const diffItem = item as {
        path: string;
        oldText?: string;
        newText: string;
      };
      blocks.push({
        type: "diff",
        path: diffItem.path,
        oldText: diffItem.oldText ?? undefined,
        newText: diffItem.newText,
      });
    } else if (item.type === "terminal") {
      flushTextParts();
      const termItem = item as { terminalId: string };
      blocks.push({
        type: "terminal",
        terminalId: termItem.terminalId,
        output: "",
        truncated: false,
        status: "running",
      });
    } else {
      log.warn("Unhandled tool content type", {
        type: (item as { type: string }).type,
      });
    }
  }

  flushTextParts();
  return blocks;
}

/**
 * Map ACP thought chunk to ThinkingDelta.
 */
export function mapThoughtChunk(
  chunk: ContentChunk,
  timestamp: number
): ThinkingDelta | null {
  const content = chunk.content;
  if (content.type === "text") {
    return { type: "thinking_delta", text: content.text, timestamp };
  }
  return null;
}

/**
 * Map ACP ContentChunk to RichMessage.
 */
export function mapContentChunk(
  chunk: ContentChunk,
  timestamp: number
): RichMessage | null {
  const content = chunk.content;

  if (content.type === "text") {
    return { type: "text_delta", text: content.text, timestamp };
  }
  if (content.type === "image") {
    const block: ImageBlock = {
      type: "image",
      data: content.data,
      mimeType: content.mimeType,
      uri: content.uri ?? undefined,
    };
    return createContentMessage([block], timestamp);
  }
  if (content.type === "audio") {
    const block: AudioBlock = {
      type: "audio",
      data: content.data,
      mimeType: content.mimeType,
    };
    return createContentMessage([block], timestamp);
  }
  if (content.type === "resource_link") {
    const block: ResourceLinkBlock = {
      type: "resource_link",
      name: content.name,
      uri: content.uri,
      description: content.description ?? undefined,
      mimeType: content.mimeType ?? undefined,
      size: content.size ? Number(content.size) : undefined,
      title: content.title ?? undefined,
    };
    return createContentMessage([block], timestamp);
  }
  if (content.type === "resource") {
    const res = content.resource;
    const block: EmbeddedResourceBlock = {
      type: "resource",
      resource:
        "text" in res
          ? {
              type: "text",
              uri: res.uri,
              text: res.text,
              mimeType: res.mimeType ?? undefined,
            }
          : {
              type: "blob",
              uri: res.uri,
              blob: res.blob,
              mimeType: res.mimeType ?? undefined,
            },
    };
    return createContentMessage([block], timestamp);
  }
  return null;
}

/**
 * Map ACP SessionUpdate to RichMessage.
 * This is the main entry point for converting ACP protocol messages to internal types.
 */
export function mapUpdateToRichMessage(
  update: SessionUpdate,
  extractToolName?: ToolNameExtractor
): RichMessage | null {
  const timestamp = Date.now();

  switch (update.sessionUpdate) {
    case "agent_message_chunk": {
      const chunk = update as ContentChunk;
      logMeta("agent_message_chunk", undefined, chunk._meta);
      return mapContentChunk(chunk, timestamp);
    }

    case "agent_thought_chunk": {
      const chunk = update as ContentChunk;
      logMeta("agent_thought_chunk", undefined, chunk._meta);
      return mapThoughtChunk(chunk, timestamp);
    }

    case "user_message_chunk": {
      const chunk = update as ContentChunk & { sessionUpdate: string };
      logMeta("user_message_chunk", undefined, chunk._meta);
      const content = chunk.content;
      if (content.type === "text") {
        const message: Message = {
          type: "message",
          role: "user",
          content: [{ type: "text", text: content.text }],
          timestamp,
        };
        return message;
      }
      return null;
    }

    case "tool_call": {
      const toolCall = update as ToolCall & { sessionUpdate: string };
      logMeta("tool_call", toolCall.toolCallId, toolCall._meta);
      const resolvedName =
        extractToolName?.(toolCall._meta ?? undefined) ?? undefined;
      const contentBlocks: InternalContentBlock[] = [
        {
          type: "tool_use",
          id: toolCall.toolCallId,
          name: toolCall.title,
          input: (toolCall.rawInput as Record<string, unknown>) || {},
          resolvedName,
          kind: toolCall.kind as ToolKind | undefined,
          status: (toolCall.status as ToolCallStatus | undefined) ?? "pending",
          locations: toolCall.locations?.map((loc) => ({
            path: loc.path,
            line: loc.line ?? undefined,
          })),
        },
      ];

      return {
        type: "message",
        role: "assistant",
        content: contentBlocks,
        timestamp,
      } as Message;
    }

    case "tool_call_update": {
      const toolUpdate = update as ToolCallUpdate & { sessionUpdate: string };
      logMeta("tool_call_update", toolUpdate.toolCallId, toolUpdate._meta);
      const resolvedName =
        extractToolName?.(toolUpdate._meta ?? undefined) ?? undefined;
      const contentBlocks: InternalContentBlock[] = [];

      if (toolUpdate.content && toolUpdate.content.length > 0) {
        contentBlocks.push(
          ...extractToolContentBlocks(
            toolUpdate.content,
            toolUpdate.toolCallId,
            toolUpdate.status === "failed"
          )
        );
      }

      if (toolUpdate.status || toolUpdate.locations || toolUpdate.title) {
        contentBlocks.push({
          type: "tool_use",
          id: toolUpdate.toolCallId,
          name: toolUpdate.title ?? "",
          input: (toolUpdate.rawInput as Record<string, unknown>) || {},
          resolvedName,
          kind: toolUpdate.kind as ToolKind | undefined,
          status:
            (toolUpdate.status as ToolCallStatus | undefined) ?? undefined,
          locations: toolUpdate.locations?.map((loc) => ({
            path: loc.path,
            line: loc.line ?? undefined,
          })),
        });
      }

      if (contentBlocks.length === 0) {
        return null;
      }

      return {
        type: "message",
        role: "assistant",
        content: contentBlocks,
        timestamp,
      } as Message;
    }

    case "current_mode_update": {
      const modeUpdate = update as CurrentModeUpdate & {
        sessionUpdate: string;
      };
      logMeta(
        "current_mode_update",
        modeUpdate.currentModeId,
        modeUpdate._meta
      );
      const systemMessage: SystemMessage = {
        type: "system",
        subtype: "mode_change",
        timestamp,
      };
      return systemMessage;
    }

    case "plan": {
      const planUpdate = update as Plan & { sessionUpdate: string };
      logMeta("plan", undefined, planUpdate._meta);
      planUpdate.entries.forEach((e, i) => {
        if (e._meta) {
          log.debug("plan_entry _meta", { index: i, meta: e._meta });
        }
      });
      const planMessage: PlanMessage = {
        type: "plan",
        entries: planUpdate.entries.map((e) => ({
          content: e.content,
          priority: e.priority,
          status: e.status,
        })),
        timestamp,
      };
      return planMessage;
    }

    case "available_commands_update":
    case "config_option_update":
    case "session_info_update": {
      const skipped = update as { sessionUpdate: string; _meta?: unknown };
      logMeta(update.sessionUpdate, undefined, skipped._meta);
      log.debug("Skipped session update type", { type: update.sessionUpdate });
      return null;
    }

    default: {
      const unknownUpdate = update as { sessionUpdate: string };
      log.warn("Unhandled session update type", {
        type: unknownUpdate.sessionUpdate,
      });
      return null;
    }
  }
}
