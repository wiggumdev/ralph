import type { RichMessage } from "./message-types";

export type OutputFormat = "stream-json" | "batch-json" | "text";

export interface StreamJsonMessage {
  type: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  content?: string;
  message?: unknown;
  [key: string]: unknown;
}

export interface ParsedChunk {
  displayText?: string;
  sessionId?: string;
  isResult?: boolean;
  resultSuccess?: boolean;
  richMessage?: RichMessage;
  logData?: StreamJsonMessage;
}

export interface ParserResult {
  sessionId?: string;
  complete: boolean;
}

export interface OutputParser {
  processChunk(chunk: string): ParsedChunk[];
  flush(): ParsedChunk[];
  getResult(): ParserResult;
}
