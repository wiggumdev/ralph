/**
 * Adapter Factory Tests
 *
 * These tests validate the getAdapter factory function that creates
 * CLI adapter instances based on configuration. The factory:
 * - Maps adapter type names to concrete implementations
 * - Provides a clean interface for the rest of the application
 * - Throws helpful errors for unknown adapter types
 *
 * Testing this module ensures the correct adapter is instantiated
 * based on user configuration and that error handling is clear.
 */

import { describe, expect, test } from "bun:test";
import { ClaudeAdapter } from "./claude";
import { getAdapter } from "./index";
import { OpenCodeAdapter } from "./opencode";

describe("getAdapter factory", () => {
  describe("adapter instantiation", () => {
    /**
     * Tests that 'claude' type returns ClaudeAdapter instance.
     * This is the default and most common adapter.
     */
    test("returns ClaudeAdapter for 'claude' type", () => {
      const adapter = getAdapter("claude");

      expect(adapter).toBeInstanceOf(ClaudeAdapter);
      expect(adapter.name).toBe("claude");
    });

    /**
     * Tests that 'opencode' type returns OpenCodeAdapter instance.
     * Alternative adapter for OpenCode CLI users.
     */
    test("returns OpenCodeAdapter for 'opencode' type", () => {
      const adapter = getAdapter("opencode");

      expect(adapter).toBeInstanceOf(OpenCodeAdapter);
      expect(adapter.name).toBe("opencode");
    });
  });

  describe("adapter interface compliance", () => {
    /**
     * Tests that returned adapter has all required properties.
     * Ensures the CLIAdapter interface is properly implemented.
     */
    test("claude adapter has required interface properties", () => {
      const adapter = getAdapter("claude");

      expect(adapter).toHaveProperty("name");
      expect(adapter).toHaveProperty("completionMarker");
      expect(adapter).toHaveProperty("supportedFormats");
      expect(typeof adapter.buildArgs).toBe("function");
      expect(typeof adapter.detectCompletion).toBe("function");
      expect(typeof adapter.isAvailable).toBe("function");
    });

    /**
     * Tests that opencode adapter has all required properties.
     * Both adapters must implement the same interface.
     */
    test("opencode adapter has required interface properties", () => {
      const adapter = getAdapter("opencode");

      expect(adapter).toHaveProperty("name");
      expect(adapter).toHaveProperty("completionMarker");
      expect(adapter).toHaveProperty("supportedFormats");
      expect(typeof adapter.buildArgs).toBe("function");
      expect(typeof adapter.detectCompletion).toBe("function");
      expect(typeof adapter.isAvailable).toBe("function");
    });
  });

  describe("error handling", () => {
    /**
     * Tests that unknown adapter type throws error.
     * TypeScript should prevent this at compile time, but
     * runtime check provides defense in depth.
     */
    test("throws for unknown adapter type", () => {
      // @ts-expect-error Testing runtime behavior with invalid type
      expect(() => getAdapter("unknown")).toThrow("Unknown adapter type");
    });

    /**
     * Tests error message includes the invalid type.
     * Helps users identify configuration issues.
     */
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
    /**
     * Tests that each call creates a new instance.
     * Prevents shared state between uses.
     */
    test("creates new instance on each call", () => {
      const adapter1 = getAdapter("claude");
      const adapter2 = getAdapter("claude");

      expect(adapter1).not.toBe(adapter2);
    });

    /**
     * Tests different adapter types create different instances.
     * Factory correctly maps types to implementations.
     */
    test("different types create different adapter classes", () => {
      const claude = getAdapter("claude");
      const opencode = getAdapter("opencode");

      expect(claude.constructor).not.toBe(opencode.constructor);
      expect(claude.name).not.toBe(opencode.name);
    });
  });
});
