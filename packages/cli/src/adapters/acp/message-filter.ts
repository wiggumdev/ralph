import { Log } from "#log";

const log = Log.create({ service: "acp" });

/**
 * Drop anything that is not a JSON-RPC message object.
 *
 * `ndJsonStream` enqueues every line the agent writes to stdout that happens
 * to parse as JSON, including bare scalars such as `"some log line"` or `42`.
 * The SDK's dispatcher then does `"method" in message`, which throws a
 * TypeError on a primitive and tears down the whole receive loop as an
 * unhandled rejection. Filtering here keeps a chatty agent from killing the
 * session.
 */
export function filterNonObjectMessages<T>(
  stream: ReadableStream<T>
): ReadableStream<T> {
  return stream.pipeThrough(
    new TransformStream<T, T>({
      transform(message, controller) {
        if (typeof message === "object" && message !== null) {
          controller.enqueue(message);
          return;
        }
        log.debug("ACP DROP", { message });
      },
    })
  );
}
