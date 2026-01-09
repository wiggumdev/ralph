import type { OutputParser, ParsedChunk, ParserResult } from "./types";

export class TextParser implements OutputParser {
  private fullOutput = "";
  private readonly completionMarker: string;

  constructor(completionMarker: string) {
    this.completionMarker = completionMarker;
  }

  processChunk(chunk: string): ParsedChunk[] {
    this.fullOutput += chunk;

    const lines = chunk.split("\n");
    const results: ParsedChunk[] = [];

    for (const line of lines) {
      if (line.trim()) {
        results.push({ displayText: line });
      }
    }

    return results;
  }

  flush(): ParsedChunk[] {
    return [];
  }

  getResult(): ParserResult {
    const complete = this.fullOutput.includes(this.completionMarker);
    return { complete };
  }
}
