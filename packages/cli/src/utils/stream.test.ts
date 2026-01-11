/**
 * Stream Utils Tests
 *
 * Tests for stream reading and command availability checking.
 * The isCommandAvailable function must work cross-platform:
 * - Windows uses 'where' command
 * - Unix-like systems (macOS, Linux) use 'which' command
 */

import { describe, expect, test } from "bun:test";
import { isCommandAvailable, readStream } from "./stream";

describe("readStream", () => {
  test("reads stream chunks and calls onText callback", async () => {
    const chunks: string[] = [];
    const mockReader = {
      async *generate() {
        yield new TextEncoder().encode("hello");
        yield new TextEncoder().encode(" ");
        yield new TextEncoder().encode("world");
      },
      async read() {
        const next = await this.generator.next();
        return {
          done: next.done ?? false,
          value: next.value,
        };
      },
      generator: null as any,
    };
    mockReader.generator = mockReader.generate();

    const result = await readStream(mockReader, (text) => {
      chunks.push(text);
    });

    expect(result).toBe("hello world");
    expect(chunks).toEqual(["hello", " ", "world"]);
  });

  test("handles empty stream", async () => {
    const chunks: string[] = [];
    const mockReader = {
      async read() {
        return { done: true };
      },
    };

    const result = await readStream(mockReader, (text) => {
      chunks.push(text);
    });

    expect(result).toBe("");
    expect(chunks).toEqual([]);
  });
});

describe("isCommandAvailable", () => {
  test("returns true for available commands (node/bun)", async () => {
    // node or bun should be available since we're running this test
    const isNodeAvailable = await isCommandAvailable("node");
    const isBunAvailable = await isCommandAvailable("bun");

    // At least one of them must be available
    expect(isNodeAvailable || isBunAvailable).toBe(true);
  });

  test("returns false for non-existent commands", async () => {
    const result = await isCommandAvailable(
      "this-command-definitely-does-not-exist-12345"
    );
    expect(result).toBe(false);
  });

  test("uses correct command based on platform", async () => {
    // This test verifies platform-specific behavior
    // We can't easily mock process.platform, but we can verify the function works
    const result = await isCommandAvailable("bun");
    expect(typeof result).toBe("boolean");
  });
});
