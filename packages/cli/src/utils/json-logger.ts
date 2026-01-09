import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { StreamJsonMessage } from "#parsers/types";

export class JsonLogger {
  private readonly path: string;
  private initialized = false;

  constructor(path: string) {
    this.path = path;
  }

  init(): void {
    if (this.initialized) {
      return;
    }

    const dir = dirname(this.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.path, "", "utf-8");
    this.initialized = true;
  }

  log(message: StreamJsonMessage): void {
    this.init();
    appendFileSync(this.path, `${JSON.stringify(message)}\n`, "utf-8");
  }

  getPath(): string {
    return this.path;
  }
}
