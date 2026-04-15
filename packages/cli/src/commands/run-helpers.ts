import type { ParsedChunk } from "#parsers";
import {
  isMessage,
  isResultMessage,
  isToolUseBlock,
} from "#parsers/message-types";

export interface TokenStats {
  toolCallCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

export function trackTokensFromChunk(chunk: ParsedChunk, stats: TokenStats) {
  const msg = chunk.richMessage;
  if (!msg) {
    return;
  }

  if (isMessage(msg)) {
    for (const block of msg.content) {
      if (isToolUseBlock(block)) {
        stats.toolCallCount++;
      }
    }
  }

  if (isResultMessage(msg)) {
    if (msg.usage) {
      stats.totalInputTokens += msg.usage.input_tokens;
      stats.totalOutputTokens += msg.usage.output_tokens;
    }
    if (msg.total_cost_usd) {
      stats.totalCost += msg.total_cost_usd;
    }
  }
}
