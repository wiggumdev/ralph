import type { RichMessage } from "./message-types";

export interface ParsedChunk {
  displayText: string;
  richMessage?: RichMessage;
}
