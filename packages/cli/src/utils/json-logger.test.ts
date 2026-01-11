import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { JsonLogger } from "./json-logger";
import type { StreamJsonMessage } from "#parsers/types";

describe("JsonLogger", () => {
  const testDir = join(import.meta.dir, ".test-json-logger");
  const testLogPath = join(testDir, "test.log");

  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory after each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("should create JsonLogger with path", () => {
      const logger = new JsonLogger(testLogPath);
      expect(logger.getPath()).toBe(testLogPath);
    });

    it("should not create file on construction", () => {
      new JsonLogger(testLogPath);
      expect(existsSync(testLogPath)).toBe(false);
    });
  });

  describe("init", () => {
    it("should create directory recursively", () => {
      const nestedPath = join(testDir, "nested", "deep", "test.log");
      const logger = new JsonLogger(nestedPath);

      logger.init();

      expect(existsSync(nestedPath)).toBe(true);
    });

    it("should create empty file", () => {
      const logger = new JsonLogger(testLogPath);

      logger.init();

      expect(existsSync(testLogPath)).toBe(true);
      const content = readFileSync(testLogPath, "utf-8");
      expect(content).toBe("");
    });

    it("should only initialize once", () => {
      const logger = new JsonLogger(testLogPath);

      logger.init();
      const firstStat = existsSync(testLogPath);

      // Write something to file
      logger.log({ role: "assistant", type: "text", text: "test" });

      // Call init again - should not overwrite file
      logger.init();

      const content = readFileSync(testLogPath, "utf-8");
      expect(firstStat).toBe(true);
      expect(content).not.toBe("");
      expect(content).toContain("test");
    });
  });

  describe("log", () => {
    it("should write JSON message to file", () => {
      const logger = new JsonLogger(testLogPath);
      const message: StreamJsonMessage = {
        role: "assistant",
        type: "text",
        text: "Hello, world!",
      };

      logger.log(message);

      const content = readFileSync(testLogPath, "utf-8");
      expect(content).toBe(`${JSON.stringify(message)}\n`);
    });

    it("should append multiple messages with newlines", () => {
      const logger = new JsonLogger(testLogPath);
      const message1: StreamJsonMessage = {
        role: "user",
        type: "text",
        text: "First message",
      };
      const message2: StreamJsonMessage = {
        role: "assistant",
        type: "text",
        text: "Second message",
      };

      logger.log(message1);
      logger.log(message2);

      const content = readFileSync(testLogPath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0] ?? "{}")).toEqual(message1);
      expect(JSON.parse(lines[1] ?? "{}")).toEqual(message2);
    });

    it("should initialize automatically if not initialized", () => {
      const logger = new JsonLogger(testLogPath);
      const message: StreamJsonMessage = {
        role: "assistant",
        type: "text",
        text: "Auto init",
      };

      // Call log without explicit init
      logger.log(message);

      expect(existsSync(testLogPath)).toBe(true);
      const content = readFileSync(testLogPath, "utf-8");
      expect(content).toContain("Auto init");
    });

    it("should handle tool_use messages", () => {
      const logger = new JsonLogger(testLogPath);
      const message: StreamJsonMessage = {
        role: "assistant",
        type: "tool_use",
        name: "test_tool",
        id: "tool_123",
        input: { arg: "value" },
      };

      logger.log(message);

      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());
      expect(parsed).toEqual(message);
      expect(parsed.type).toBe("tool_use");
      expect(parsed.name).toBe("test_tool");
    });

    it("should handle tool_result messages", () => {
      const logger = new JsonLogger(testLogPath);
      const message: StreamJsonMessage = {
        role: "user",
        type: "tool_result",
        tool_use_id: "tool_123",
        content: "Result data",
      };

      logger.log(message);

      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());
      expect(parsed).toEqual(message);
      expect(parsed.type).toBe("tool_result");
      expect(parsed.tool_use_id).toBe("tool_123");
    });

    it("should handle messages with special characters", () => {
      const logger = new JsonLogger(testLogPath);
      const message: StreamJsonMessage = {
        role: "assistant",
        type: "text",
        text: 'Special chars: "quotes", \\backslash, \nnewline, \ttab',
      };

      logger.log(message);

      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());
      expect(parsed.text).toBe(message.text);
    });

    it("should handle empty text messages", () => {
      const logger = new JsonLogger(testLogPath);
      const message: StreamJsonMessage = {
        role: "assistant",
        type: "text",
        text: "",
      };

      logger.log(message);

      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());
      expect(parsed.text).toBe("");
    });
  });

  describe("getPath", () => {
    it("should return the configured path", () => {
      const logger = new JsonLogger(testLogPath);
      expect(logger.getPath()).toBe(testLogPath);
    });

    it("should return path before initialization", () => {
      const logger = new JsonLogger(testLogPath);
      const path = logger.getPath();
      expect(path).toBe(testLogPath);
      expect(existsSync(testLogPath)).toBe(false);
    });

    it("should return path after initialization", () => {
      const logger = new JsonLogger(testLogPath);
      logger.init();
      expect(logger.getPath()).toBe(testLogPath);
    });
  });

  describe("edge cases", () => {
    it("should handle rapid sequential writes", () => {
      const logger = new JsonLogger(testLogPath);
      const messages: StreamJsonMessage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          role: "assistant",
          type: "text",
          text: `Message ${i}`,
        })
      );

      for (const msg of messages) {
        logger.log(msg);
      }

      const content = readFileSync(testLogPath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(100);

      // Verify first and last message
      expect(JSON.parse(lines[0] ?? "{}").text).toBe("Message 0");
      expect(JSON.parse(lines[99] ?? "{}").text).toBe("Message 99");
    });

    it("should preserve message order", () => {
      const logger = new JsonLogger(testLogPath);
      const roles = ["user", "assistant", "user", "assistant"];

      for (const [i, role] of roles.entries()) {
        logger.log({
          role: role as "user" | "assistant",
          type: "text",
          text: `Message ${i}`,
        });
      }

      const content = readFileSync(testLogPath, "utf-8");
      const lines = content.trim().split("\n");
      const parsed = lines.map((line) => JSON.parse(line));

      expect(parsed[0]?.role).toBe("user");
      expect(parsed[1]?.role).toBe("assistant");
      expect(parsed[2]?.role).toBe("user");
      expect(parsed[3]?.role).toBe("assistant");
    });
  });
});
