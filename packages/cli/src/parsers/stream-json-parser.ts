import type {
  ContentBlock,
  Message,
  ResultMessage,
  SystemMessage,
} from "./message-types";
import type {
  OutputParser,
  ParsedChunk,
  ParserResult,
  StreamJsonMessage,
} from "./types";

export class StreamJsonParser implements OutputParser {
  private buffer = "";
  private sessionId?: string;
  private hasResult = false;
  private resultSuccess = false;

  processChunk(chunk: string): ParsedChunk[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");

    // Keep last incomplete line in buffer
    this.buffer = lines.pop() || "";

    const results: ParsedChunk[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const msg = JSON.parse(line) as StreamJsonMessage;
        const parsed = this.processMessage(msg);
        if (parsed) {
          results.push(parsed);
        }
      } catch {
        // Not valid JSON - treat as text fallback
        results.push({ displayText: line });
      }
    }

    return results;
  }

  flush(): ParsedChunk[] {
    if (!this.buffer.trim()) {
      return [];
    }

    const results: ParsedChunk[] = [];
    try {
      const msg = JSON.parse(this.buffer) as StreamJsonMessage;
      const parsed = this.processMessage(msg);
      if (parsed) {
        results.push(parsed);
      }
    } catch {
      results.push({ displayText: this.buffer });
    }

    this.buffer = "";
    return results;
  }

  getResult(): ParserResult {
    return {
      sessionId: this.sessionId,
      complete: this.hasResult && this.resultSuccess,
    };
  }

  private processMessage(msg: StreamJsonMessage): ParsedChunk | null {
    const chunk: ParsedChunk = {
      logData: msg,
    };

    // Extract session_id from any message that has it
    if (msg.session_id) {
      this.sessionId = msg.session_id;
      chunk.sessionId = msg.session_id;
    }

    // Check for result message type (completion status)
    // subtype: "success" just means Claude finished - check for completion marker
    if (msg.type === "result") {
      this.hasResult = true;
      const resultText = typeof msg.result === "string" ? msg.result : "";
      this.resultSuccess = resultText.includes("<promise>COMPLETE</promise>");
      chunk.isResult = true;
      chunk.resultSuccess = this.resultSuccess;

      // Create rich result message
      chunk.richMessage = {
        type: "result",
        subtype: (msg.subtype as ResultMessage["subtype"]) || "success",
        result: resultText,
        complete: this.resultSuccess,
        duration_ms: msg.duration_ms as number | undefined,
        total_cost_usd: msg.total_cost_usd as number | undefined,
        usage: msg.usage as ResultMessage["usage"],
        timestamp: Date.now(),
      };
    }

    // Parse rich messages for assistant/user types
    if (msg.type === "assistant" || msg.type === "user") {
      const richMessage = this.parseRichMessage(msg);
      if (richMessage) {
        chunk.richMessage = richMessage;
      }
    }

    // Parse system messages
    if (msg.type === "system") {
      chunk.richMessage = this.parseSystemMessage(msg);
    }

    // Extract displayable content based on message type (backwards compat)
    const displayText = this.extractDisplayText(msg);
    if (displayText) {
      chunk.displayText = displayText;
    }

    // Return null if nothing useful extracted
    if (
      !(
        chunk.displayText ||
        chunk.sessionId ||
        chunk.isResult ||
        chunk.richMessage
      )
    ) {
      return null;
    }

    return chunk;
  }

  private parseRichMessage(msg: StreamJsonMessage): Message | null {
    const message = msg.message as {
      role?: string;
      content?: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
        tool_use_id?: string;
        is_error?: boolean;
        content?: string | Array<{ type: string; text?: string }>;
      }>;
    };

    if (!(message?.content && Array.isArray(message.content))) {
      return null;
    }

    const contentBlocks: ContentBlock[] = message.content
      .map((block): ContentBlock | null => {
        if (block.type === "text") {
          return { type: "text", text: block.text || "" };
        }
        if (block.type === "tool_use") {
          return {
            type: "tool_use",
            id: block.id || "",
            name: block.name || "",
            input: block.input || {},
          };
        }
        if (block.type === "tool_result") {
          return {
            type: "tool_result",
            tool_use_id: block.tool_use_id || "",
            content: block.content,
            is_error: block.is_error,
          };
        }
        return null;
      })
      .filter((block): block is ContentBlock => block !== null);

    if (contentBlocks.length === 0) {
      return null;
    }

    return {
      type: "message",
      role: (message.role as Message["role"]) || "assistant",
      content: contentBlocks,
      timestamp: Date.now(),
    };
  }

  private parseSystemMessage(msg: StreamJsonMessage): SystemMessage {
    return {
      type: "system",
      subtype: msg.subtype,
      session_id: msg.session_id,
      model: msg.model as string | undefined,
      tools: msg.tools as string[] | undefined,
      cwd: msg.cwd as string | undefined,
      timestamp: Date.now(),
    };
  }

  private extractDisplayText(msg: StreamJsonMessage): string | null {
    // Handle different message types from Claude stream-json output
    switch (msg.type) {
      case "assistant": {
        // Extract text from message.content array
        const message = msg.message as {
          content?: Array<{ type: string; text?: string }>;
        };
        if (message?.content && Array.isArray(message.content)) {
          const textParts = message.content
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text);
          if (textParts.length > 0) {
            return textParts.join("");
          }
        }
        break;
      }
      case "result":
        // Result contains same text as assistant - skip to avoid duplicate
        break;
      case "error":
        if (msg.message && typeof msg.message === "string") {
          return `[ERROR] ${msg.message}`;
        }
        break;
      case "system":
        // System init message - no display text needed
        break;
      default:
        break;
    }

    return null;
  }
}
