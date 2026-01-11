/**
 * Helper functions for the run command loop.
 * Extracted from runLoopPlain to reduce cognitive complexity.
 */

import type { ParsedChunk } from "#parsers";
import {
  isMessage,
  isResultMessage,
  isToolUseBlock,
} from "#parsers/message-types";

/**
 * Statistics tracked during the run loop
 */
export interface TokenStats {
  toolCallCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

/**
 * Tracks token usage and tool calls from a parsed chunk.
 * Mutates the stats object in place for performance.
 *
 * @param chunk - Parsed chunk from the stream parser
 * @param stats - Statistics object to update
 */
export function trackTokensFromChunk(
  chunk: ParsedChunk,
  stats: TokenStats
): void {
  if (!chunk.richMessage) {
    return;
  }

  // Track tool calls from message content
  if (isMessage(chunk.richMessage)) {
    const toolCalls = chunk.richMessage.content.filter(isToolUseBlock);
    stats.toolCallCount += toolCalls.length;
  }

  // Track token usage and cost from result messages
  if (isResultMessage(chunk.richMessage)) {
    if (chunk.richMessage.usage) {
      stats.totalInputTokens += chunk.richMessage.usage.input_tokens;
      stats.totalOutputTokens += chunk.richMessage.usage.output_tokens;
    }
    if (chunk.richMessage.total_cost_usd !== undefined) {
      stats.totalCost += chunk.richMessage.total_cost_usd;
    }
  }
}
