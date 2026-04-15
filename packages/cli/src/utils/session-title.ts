import type { SessionItem, SessionState } from "#parsers/message-types";
import {
  isMessageItem,
  isTextBlock,
  isTextDeltaItem,
} from "#parsers/message-types";

const MAX_TITLE_LENGTH = 50;

/**
 * Get session title from the last message summary.
 * Returns empty string while session is running.
 */
export function getSessionTitle(session: SessionState): string {
  if (session.status === "running" || session.status === "paused") {
    return "";
  }

  const lastMessage = findLastTextMessage(session.items);
  if (!lastMessage) {
    return "";
  }

  return truncateTitle(lastMessage, MAX_TITLE_LENGTH);
}

function extractItemText(item: SessionItem): string | null {
  if (isTextDeltaItem(item)) {
    const text = extractFirstLine(item.data.text);
    return text.length > 0 ? text : null;
  }

  if (isMessageItem(item) && item.data.role === "assistant") {
    for (const block of item.data.content) {
      if (isTextBlock(block)) {
        const text = extractFirstLine(block.text);
        if (text.length > 0) {
          return text;
        }
      }
    }
  }

  return null;
}

function findLastTextMessage(items: SessionItem[]): string | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!item) {
      continue;
    }
    const text = extractItemText(item);
    if (text) {
      return text;
    }
  }
  return null;
}

function extractFirstLine(text: string): string {
  const trimmed = text.trim();
  const firstLine = trimmed.split("\n")[0];
  return firstLine?.trim() || "";
}

function truncateTitle(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 3)}...`;
}
