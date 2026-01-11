import type {
  ContentBlock,
  Message,
  ResultMessage,
  SystemMessage,
} from "./message-types";
import type { OutputParser, ParsedChunk, ParserResult } from "./types";

interface OpenCodeTokens {
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;
    write: number;
  };
}

interface OpenCodeToolState {
  status: string;
  input?: Record<string, unknown>;
  output?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  time?: { start: number; end: number };
}

interface OpenCodePart {
  id: string;
  sessionID: string;
  messageID: string;
  type: string;
  text?: string;
  tool?: string;
  callID?: string;
  state?: OpenCodeToolState;
  reason?: string;
  cost?: number;
  tokens?: OpenCodeTokens;
  snapshot?: string;
  time?: { start: number; end: number };
}

interface OpenCodeEvent {
  type: string;
  timestamp: number;
  sessionID: string;
  part: OpenCodePart;
}

export class OpenCodeJsonParser implements OutputParser {
  private buffer = "";
  private sessionId?: string;
  private hasResult = false;
  private resultSuccess = false;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCost = 0;
  private readonly completionMarker: string;

  constructor(completionMarker = "<promise>COMPLETE</promise>") {
    this.completionMarker = completionMarker;
  }

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
        const event = JSON.parse(line) as OpenCodeEvent;
        const parsed = this.processEvent(event);
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
      const event = JSON.parse(this.buffer) as OpenCodeEvent;
      const parsed = this.processEvent(event);
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

  private processEvent(event: OpenCodeEvent): ParsedChunk | null {
    // Extract session ID
    if (event.sessionID && !this.sessionId) {
      this.sessionId = event.sessionID;
    }

    switch (event.type) {
      case "step_start":
        return this.processStepStart(event);
      case "text":
        return this.processText(event);
      case "tool_use":
        return this.processToolUse(event);
      case "step_finish":
        return this.processStepFinish(event);
      default:
        return null;
    }
  }

  private processStepStart(event: OpenCodeEvent): ParsedChunk | null {
    const systemMessage: SystemMessage = {
      type: "system",
      subtype: "step_start",
      session_id: event.sessionID,
      timestamp: event.timestamp,
    };

    return {
      sessionId: event.sessionID,
      richMessage: systemMessage,
    };
  }

  private processText(event: OpenCodeEvent): ParsedChunk | null {
    const text = event.part.text;
    if (!text) {
      return null;
    }

    // Check for completion marker
    if (text.includes(this.completionMarker)) {
      this.resultSuccess = true;
    }

    const contentBlocks: ContentBlock[] = [{ type: "text", text }];

    const message: Message = {
      type: "message",
      role: "assistant",
      content: contentBlocks,
      timestamp: event.timestamp,
    };

    return {
      displayText: text,
      richMessage: message,
    };
  }

  private processToolUse(event: OpenCodeEvent): ParsedChunk | null {
    const { part } = event;
    const state = part.state;

    if (!state) {
      return null;
    }

    const contentBlocks: ContentBlock[] = [];

    // Add tool_use block
    contentBlocks.push({
      type: "tool_use",
      id: part.callID || part.id,
      name: part.tool || "unknown",
      input: state.input || {},
    });

    // Add tool_result block if output exists
    if (state.output !== undefined) {
      contentBlocks.push({
        type: "tool_result",
        tool_use_id: part.callID || part.id,
        content: state.output,
        is_error: state.status !== "completed",
      });
    }

    const message: Message = {
      type: "message",
      role: "assistant",
      content: contentBlocks,
      timestamp: event.timestamp,
    };

    // Create display text for the tool call
    const toolName = part.tool || "unknown";
    const displayText = `[Tool: ${toolName}] ${state.title || ""}`;

    return {
      displayText,
      richMessage: message,
    };
  }

  private processStepFinish(event: OpenCodeEvent): ParsedChunk | null {
    const { part } = event;
    this.hasResult = true;

    // Accumulate token usage
    if (part.tokens) {
      this.totalInputTokens += part.tokens.input + part.tokens.cache.read;
      this.totalOutputTokens += part.tokens.output;
    }

    // Accumulate cost
    if (part.cost !== undefined) {
      this.totalCost += part.cost;
    }

    // Check if this is a final stop (not tool-calls)
    const isFinalStep = part.reason === "stop";

    const resultMessage: ResultMessage = {
      type: "result",
      subtype: isFinalStep ? "success" : "error_during_execution",
      complete: this.resultSuccess,
      usage: {
        input_tokens: this.totalInputTokens,
        output_tokens: this.totalOutputTokens,
      },
      total_cost_usd: this.totalCost,
      timestamp: event.timestamp,
    };

    return {
      isResult: isFinalStep,
      resultSuccess: this.resultSuccess,
      richMessage: resultMessage,
    };
  }
}
