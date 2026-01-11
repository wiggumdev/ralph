import { OpenCodeJsonParser } from "./opencode-json-parser";
import { StreamJsonParser } from "./stream-json-parser";
import { TextParser } from "./text-parser";
import type { OutputFormat, OutputParser } from "./types";

export type {
  OutputFormat,
  OutputParser,
  ParsedChunk,
  ParserResult,
} from "./types";

export function createParser(
  format: OutputFormat,
  completionMarker: string
): OutputParser {
  switch (format) {
    case "stream-json":
      return new StreamJsonParser();
    case "opencode-json":
      return new OpenCodeJsonParser(completionMarker);
    case "text":
      return new TextParser(completionMarker);
    default:
      return new TextParser(completionMarker);
  }
}
