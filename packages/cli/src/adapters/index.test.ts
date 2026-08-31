/**
 * Adapter Factory Tests
 *
 * Tests for the ACP adapter factory that creates adapter instances.
 */

import { describe, expect, test } from "bun:test";
import { ClaudeAcpAdapter } from "./claude";
import { CopilotAcpAdapter } from "./copilot";
import { GeminiAcpAdapter } from "./gemini";
import { getAdapter } from "./index";
import { OpenCodeAcpAdapter } from "./opencode";

describe("getAdapter factory", () => {
  describe("adapter instantiation", () => {
    test("returns ClaudeAcpAdapter for 'claude' type", () => {
      const adapter = getAdapter("claude");

      expect(adapter).toBeInstanceOf(ClaudeAcpAdapter);
      expect(adapter.name).toBe("claude");
      expect(adapter.command).toBe("claude-code-acp");
    });

    test("returns OpenCodeAcpAdapter for 'opencode' type", () => {
      const adapter = getAdapter("opencode");

      expect(adapter).toBeInstanceOf(OpenCodeAcpAdapter);
      expect(adapter.name).toBe("opencode");
      expect(adapter.command).toBe("opencode");
    });

    test("returns GeminiAcpAdapter for 'gemini' type", () => {
      const adapter = getAdapter("gemini");

      expect(adapter).toBeInstanceOf(GeminiAcpAdapter);
      expect(adapter.name).toBe("gemini");
      expect(adapter.command).toBe("gemini");
    });

    test("returns CopilotAcpAdapter for 'copilot' type", () => {
      const adapter = getAdapter("copilot");

      expect(adapter).toBeInstanceOf(CopilotAcpAdapter);
      expect(adapter.name).toBe("copilot");
      expect(adapter.command).toBe("copilot");
      expect(adapter.args).toEqual(["--acp"]);
    });
  });

  describe("ACP adapter interface", () => {
    test("claude adapter has required interface properties", () => {
      const adapter = getAdapter("claude");

      expect(adapter).toHaveProperty("name");
      expect(adapter).toHaveProperty("command");
      expect(adapter).toHaveProperty("args");
      expect(typeof adapter.isAvailable).toBe("function");
      expect(typeof adapter.run).toBe("function");
      expect(typeof adapter.cancel).toBe("function");
    });

    test("opencode adapter has required interface properties", () => {
      const adapter = getAdapter("opencode");

      expect(adapter).toHaveProperty("name");
      expect(adapter).toHaveProperty("command");
      expect(adapter).toHaveProperty("args");
      expect(typeof adapter.isAvailable).toBe("function");
      expect(typeof adapter.run).toBe("function");
      expect(typeof adapter.cancel).toBe("function");
    });

    test("gemini adapter has required interface properties", () => {
      const adapter = getAdapter("gemini");

      expect(adapter).toHaveProperty("name");
      expect(adapter).toHaveProperty("command");
      expect(adapter).toHaveProperty("args");
      expect(typeof adapter.isAvailable).toBe("function");
      expect(typeof adapter.run).toBe("function");
      expect(typeof adapter.cancel).toBe("function");
    });

    test("copilot adapter has required interface properties", () => {
      const adapter = getAdapter("copilot");

      expect(adapter).toHaveProperty("name");
      expect(adapter).toHaveProperty("command");
      expect(adapter).toHaveProperty("args");
      expect(typeof adapter.isAvailable).toBe("function");
      expect(typeof adapter.run).toBe("function");
      expect(typeof adapter.cancel).toBe("function");
    });

    test("copilot adapter returns equals-form resume command", () => {
      const adapter = getAdapter("copilot");
      const resume = adapter.getResumeCommand("abc123");

      expect(resume).toEqual({
        command: "copilot",
        args: ["--resume=abc123"],
      });
    });
  });

  describe("error handling", () => {
    test("throws for unknown adapter type", () => {
      // @ts-expect-error Testing runtime behavior with invalid type
      expect(() => getAdapter("unknown")).toThrow("Unknown adapter type");
    });

    test("error message includes invalid type name", () => {
      try {
        // @ts-expect-error Testing runtime behavior with invalid type
        getAdapter("invalid-adapter");
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toContain("invalid-adapter");
      }
    });
  });

  describe("factory creates fresh instances", () => {
    test("creates new instance on each call", () => {
      const adapter1 = getAdapter("claude");
      const adapter2 = getAdapter("claude");

      expect(adapter1).not.toBe(adapter2);
    });

    test("different types create different adapter classes", () => {
      const claude = getAdapter("claude");
      const opencode = getAdapter("opencode");
      const gemini = getAdapter("gemini");
      const copilot = getAdapter("copilot");

      expect(claude.constructor).not.toBe(opencode.constructor);
      expect(claude.constructor).not.toBe(gemini.constructor);
      expect(claude.constructor).not.toBe(copilot.constructor);
      expect(gemini.constructor).not.toBe(copilot.constructor);
      expect(claude.name).not.toBe(opencode.name);
      expect(claude.name).not.toBe(copilot.name);
    });
  });
});
