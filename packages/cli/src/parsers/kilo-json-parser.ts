import type {
  ContentBlock,
  Message,
  ResultMessage,
  RichMessage,
  SystemMessage,
} from "./message-types";
import type { OutputParser, ParsedChunk, ParserResult } from "./types";

/**
 * Kilo JSON message structure (based on common AI agent patterns)
 *
 * Kilo's --json output provides structured data about the execution,
 * including messages, tool calls, and results. This parser handles
 * batch JSON output (all data arrives at end, not streamed).
 */
interface KiloJsonOutput {
  // Session/execution metadata
  sessionId?: string;
  model?: string;
  mode?: string;

  // Messages exchanged during execution
  messages?: KiloMessage[];

  // Execution result
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    duration_ms?: number;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };

  // Alternative flat structures Kilo might use
  output?: string;
  success?: boolean;
  error?: string;
}

interface KiloMessage {
  role: "user" | "assistant" | "system";
  content: string | KiloContentBlock[];
  timestamp?: number;
}

interface KiloContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

/**
 * Parser for Kilo Code's batch JSON output.
 *
 * Unlike Claude's stream-json, Kilo outputs all JSON at once when
 * the task completes. This parser accumulates the output and parses
 * it on flush() to create rich messages for TUI display.
 */
export class KiloJsonParser implements OutputParser {
  private buffer = "";
  private sessionId?: string;
  private complete = false;
  private parsedMessages: RichMessage[] = [];
  private completionMarker = "<promise>COMPLETE</promise>";

  processChunk(chunk: string): ParsedChunk[] {
    // Accumulate all output - Kilo sends JSON as a single blob
    this.buffer += chunk;

    // For batch JSON, we don't emit rich messages until flush()
    // But we can still show raw output for progress indication
    const lines = chunk.split("\n").filter((l) => l.trim());

    // Check if any line looks like the start of JSON
    const hasJsonStart = lines.some(
      (l) => l.trim().startsWith("{") || l.trim().startsWith("[")
    );

    if (!hasJsonStart) {
      // Non-JSON output - display as text for progress
      return lines.map((line) => ({ displayText: line }));
    }

    // JSON is accumulating - don't display raw JSON
    return [];
  }

  flush(): ParsedChunk[] {
    const results: ParsedChunk[] = [];

    if (!this.buffer.trim()) {
      return results;
    }

    // Check for completion marker in raw output
    if (this.buffer.includes(this.completionMarker)) {
      this.complete = true;
    }

    try {
      const json = this.parseJsonFromBuffer();
      if (json) {
        results.push(...this.convertToRichMessages(json));
      }
    } catch {
      // Failed to parse as JSON - return as plain text
      results.push({ displayText: this.buffer });
    }

    this.buffer = "";
    return results;
  }

  getResult(): ParserResult {
    return {
      sessionId: this.sessionId,
      complete: this.complete,
    };
  }

  private parseJsonFromBuffer(): KiloJsonOutput | null {
    const trimmed = this.buffer.trim();

    // Try to find JSON object in the output
    // Kilo might output text before/after JSON
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      return null;
    }

    const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonStr) as KiloJsonOutput;
  }

  private convertToRichMessages(json: KiloJsonOutput): ParsedChunk[] {
    const results: ParsedChunk[] = [];

    // Extract session ID
    if (json.sessionId) {
      this.sessionId = json.sessionId;
    }

    // Create system message if we have metadata
    if (json.model || json.mode) {
      const systemMsg: SystemMessage = {
        type: "system",
        subtype: "init",
        session_id: json.sessionId,
        model: json.model,
        timestamp: Date.now(),
      };
      results.push({ richMessage: systemMsg, sessionId: json.sessionId });
    }

    // Convert messages to rich format
    if (json.messages && Array.isArray(json.messages)) {
      for (const msg of json.messages) {
        const richMsg = this.convertMessage(msg);
        if (richMsg) {
          results.push({ richMessage: richMsg });
        }
      }
    }

    // Create result message
    const resultMsg = this.createResultMessage(json);
    if (resultMsg) {
      results.push({
        richMessage: resultMsg,
        isResult: true,
        resultSuccess: this.complete,
      });
    }

    return results;
  }

  private convertMessage(msg: KiloMessage): Message | null {
    if (msg.role === "system") {
      return null; // Handle system messages separately
    }

    const contentBlocks = this.parseContent(msg.content);
    if (contentBlocks.length === 0) {
      return null;
    }

    return {
      type: "message",
      role: msg.role,
      content: contentBlocks,
      timestamp: msg.timestamp || Date.now(),
    };
  }

  private parseContent(
    content: string | KiloContentBlock[]
  ): ContentBlock[] {
    if (typeof content === "string") {
      // Check for completion marker
      if (content.includes(this.completionMarker)) {
        this.complete = true;
      }
      return [{ type: "text", text: content }];
    }

    if (!Array.isArray(content)) {
      return [];
    }

    return content
      .map((block): ContentBlock | null => {
        if (block.type === "text") {
          const text = block.text || "";
          if (text.includes(this.completionMarker)) {
            this.complete = true;
          }
          return { type: "text", text };
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
  }

  private createResultMessage(json: KiloJsonOutput): ResultMessage | null {
    // Handle explicit result object
    if (json.result) {
      const resultText = json.result.output || json.result.error || "";
      if (resultText.includes(this.completionMarker)) {
        this.complete = true;
      }

      return {
        type: "result",
        subtype: json.result.success ? "success" : "error_during_execution",
        result: resultText,
        complete: this.complete,
        duration_ms: json.result.duration_ms,
        usage: json.result.usage
          ? {
              input_tokens: json.result.usage.input_tokens || 0,
              output_tokens: json.result.usage.output_tokens || 0,
            }
          : undefined,
        timestamp: Date.now(),
      };
    }

    // Handle flat output structure
    if (json.output !== undefined || json.success !== undefined) {
      const resultText = json.output || json.error || "";
      if (resultText.includes(this.completionMarker)) {
        this.complete = true;
      }

      return {
        type: "result",
        subtype: json.success !== false ? "success" : "error_during_execution",
        result: resultText,
        complete: this.complete,
        timestamp: Date.now(),
      };
    }

    return null;
  }
}
