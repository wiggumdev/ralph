import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";

let logPath: string | null = null;

export function initTransportLog(cwd: string): string {
  logPath = path.join(cwd, `ralph-transport-${Date.now()}.log`);
  writeFileSync(logPath, "");
  return logPath;
}

export function logTransport(direction: "IN" | "OUT", message: unknown): void {
  if (!logPath) {
    return;
  }
  const entry = JSON.stringify({
    ts: Date.now(),
    dir: direction,
    msg: message,
  });
  appendFileSync(logPath, `${entry}\n`);
}

export function wrapReadableWithLogging<T>(
  stream: ReadableStream<T>
): ReadableStream<T> {
  return stream.pipeThrough(
    new TransformStream({
      transform(message, controller) {
        logTransport("IN", message);
        controller.enqueue(message);
      },
    })
  );
}

export function wrapWritableWithLogging<T>(
  stream: WritableStream<T>
): WritableStream<T> {
  const underlying = stream.getWriter();
  return new WritableStream({
    async write(message) {
      logTransport("OUT", message);
      await underlying.write(message);
    },
    close() {
      underlying.close();
    },
    abort(reason) {
      underlying.abort(reason);
    },
  });
}
