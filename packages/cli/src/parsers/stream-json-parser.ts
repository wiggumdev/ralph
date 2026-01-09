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
    const chunk: ParsedChunk = {};

    // Extract session_id from any message that has it
    if (msg.session_id) {
      this.sessionId = msg.session_id;
      chunk.sessionId = msg.session_id;
    }

    // Check for result message type (completion status)
    // subtype: "success" just means Claude finished - check for completion marker
    if (msg.type === "result" && msg.subtype === "success") {
      this.hasResult = true;
      const resultText = typeof msg.result === "string" ? msg.result : "";
      this.resultSuccess = resultText.includes("<promise>COMPLETE</promise>");
      chunk.isResult = true;
      chunk.resultSuccess = this.resultSuccess;
    }

    // Extract displayable content based on message type
    const displayText = this.extractDisplayText(msg);
    if (displayText) {
      chunk.displayText = displayText;
    }

    // Return null if nothing useful extracted
    if (!(chunk.displayText || chunk.sessionId || chunk.isResult)) {
      return null;
    }

    return chunk;
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
