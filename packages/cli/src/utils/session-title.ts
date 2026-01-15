import type { RichMessage, SessionState } from "#parsers/message-types";
import { isMessage, isTextBlock } from "#parsers/message-types";

const MAX_TITLE_LENGTH = 50;

/**
 * Get session title from the last message summary.
 * Returns empty string while session is running.
 */
export function getSessionTitle(session: SessionState): string {
  if (session.status === "running" || session.status === "paused") {
    return "";
  }

  const lastMessage = findLastTextMessage(session.messages);
  if (!lastMessage) {
    return "";
  }

  return truncateTitle(lastMessage, MAX_TITLE_LENGTH);
}

function findLastTextMessage(messages: RichMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!(msg && isMessage(msg))) {
      continue;
    }
    if (msg.role !== "assistant") {
      continue;
    }

    for (const block of msg.content) {
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
