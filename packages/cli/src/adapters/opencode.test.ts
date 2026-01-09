/**
 * OpenCode Adapter Tests
 *
 * These tests validate the OpenCodeAdapter which interfaces with the OpenCode CLI.
 * The adapter is an alternative to Claude adapter for users who prefer OpenCode.
 * It is responsible for:
 * - Building correct command-line arguments for opencode CLI
 * - Detecting task completion via the completion marker
 * - Reporting supported output formats (text only)
 *
 * Testing this module ensures Ralph can correctly invoke OpenCode CLI
 * and interpret its output for the agent loop.
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { OpenCodeAdapter } from "./opencode";

describe("OpenCodeAdapter", () => {
  let adapter: OpenCodeAdapter;

  beforeEach(() => {
    adapter = new OpenCodeAdapter();
  });

  describe("properties", () => {
    /**
     * Tests that adapter name is 'opencode'.
     * Name is used for identification and availability checking.
     */
    test("has correct name", () => {
      expect(adapter.name).toBe("opencode");
    });

    /**
     * Tests that completion marker matches expected format.
     * OpenCode uses same completion marker as Claude.
     */
    test("has correct completion marker", () => {
      expect(adapter.completionMarker).toBe("<promise>COMPLETE</promise>");
    });

    /**
     * Tests that supported formats only includes text.
     * OpenCode CLI doesn't support stream-json format.
     */
    test("only supports text format", () => {
      expect(adapter.supportedFormats).toContain("text");
      expect(adapter.supportedFormats).not.toContain("stream-json");
      expect(adapter.supportedFormats).toHaveLength(1);
    });
  });

  describe("buildArgs", () => {
    /**
     * Tests that basic args include opencode command and non-interactive flag.
     * Non-interactive mode is required for automated execution.
     */
    test("includes base command and non-interactive flag", () => {
      const args = adapter.buildArgs("Test prompt", {});

      expect(args[0]).toBe("opencode");
      expect(args).toContain("--non-interactive");
    });

    /**
     * Tests that prompt is passed with -m flag.
     * OpenCode uses -m for message/prompt input.
     */
    test("includes prompt with -m flag", () => {
      const prompt = "Do something useful";
      const args = adapter.buildArgs(prompt, {});

      const promptIndex = args.indexOf("-m");
      expect(promptIndex).toBeGreaterThan(-1);
      expect(args[promptIndex + 1]).toBe(prompt);
    });

    /**
     * Tests that verbose option adds verbose flag.
     * Verbose flag provides additional logging output.
     */
    test("adds verbose flag when verbose is true", () => {
      const args = adapter.buildArgs("Prompt", { verbose: true });

      expect(args).toContain("--verbose");
    });

    /**
     * Tests that verbose false doesn't add verbose flag.
     * Default should not include verbose output.
     */
    test("does not add verbose flag when verbose is false", () => {
      const args = adapter.buildArgs("Prompt", { verbose: false });

      expect(args).not.toContain("--verbose");
    });

    /**
     * Tests that output format is ignored (only text supported).
     * OpenCode doesn't support stream-json, so format option is ignored.
     */
    test("ignores output format option", () => {
      const args = adapter.buildArgs("Prompt", { outputFormat: "stream-json" });

      // Should not add any output format flags
      expect(args).not.toContain("--output-format");
      expect(args).not.toContain("stream-json");
    });

    /**
     * Tests that all options can be combined correctly.
     * Real usage may set multiple options.
     */
    test("combines options correctly", () => {
      const args = adapter.buildArgs("Complex prompt", {
        verbose: true,
        outputFormat: "text",
      });

      expect(args).toContain("opencode");
      expect(args).toContain("--non-interactive");
      expect(args).toContain("--verbose");
      expect(args).toContain("-m");
      expect(args).toContain("Complex prompt");
    });

    /**
     * Tests that prompts with special characters are preserved.
     * Prompts may contain quotes, newlines, etc.
     */
    test("preserves special characters in prompt", () => {
      const prompt = 'Create a "test" with\nmultiple lines';
      const args = adapter.buildArgs(prompt, {});

      const promptIndex = args.indexOf("-m");
      expect(args[promptIndex + 1]).toBe(prompt);
    });

    /**
     * Tests that empty prompt is passed correctly.
     * Edge case that shouldn't break arg building.
     */
    test("handles empty prompt", () => {
      const args = adapter.buildArgs("", {});

      const promptIndex = args.indexOf("-m");
      expect(promptIndex).toBeGreaterThan(-1);
      expect(args[promptIndex + 1]).toBe("");
    });

    /**
     * Tests that cwd option is ignored (not passed to opencode).
     * cwd is used by Ralph internally, not passed to CLI.
     */
    test("ignores cwd option", () => {
      const args = adapter.buildArgs("Prompt", { cwd: "/some/path" });

      expect(args).not.toContain("/some/path");
      expect(args).not.toContain("--cwd");
    });

    /**
     * Tests that args order is correct.
     * Command should come first, then flags, then message.
     */
    test("maintains correct argument order", () => {
      const args = adapter.buildArgs("Prompt", { verbose: true });

      // opencode should be first
      expect(args[0]).toBe("opencode");

      // -m and prompt should be at the end
      const mIndex = args.indexOf("-m");
      expect(mIndex).toBe(args.length - 2);
    });
  });

  describe("detectCompletion", () => {
    /**
     * Tests that completion marker is detected in output.
     * Exact marker match triggers completion.
     */
    test("returns true when marker is present", () => {
      const output = "Task completed!\n<promise>COMPLETE</promise>";
      expect(adapter.detectCompletion(output)).toBe(true);
    });

    /**
     * Tests that missing marker returns false.
     * No marker means task is not complete.
     */
    test("returns false when marker is absent", () => {
      const output = "Still working on it...";
      expect(adapter.detectCompletion(output)).toBe(false);
    });

    /**
     * Tests that partial marker doesn't trigger completion.
     * Only exact match should work.
     */
    test("returns false for partial marker", () => {
      const output = "<promise>COMP";
      expect(adapter.detectCompletion(output)).toBe(false);
    });

    /**
     * Tests that marker anywhere in output is detected.
     * Marker may appear mid-stream.
     */
    test("detects marker anywhere in output", () => {
      const output = "Beginning\n<promise>COMPLETE</promise>\nEnd";
      expect(adapter.detectCompletion(output)).toBe(true);
    });

    /**
     * Tests that empty output returns false.
     * No output means not complete.
     */
    test("returns false for empty output", () => {
      expect(adapter.detectCompletion("")).toBe(false);
    });

    /**
     * Tests that case-sensitive marker matching.
     * Marker must be exact case match.
     */
    test("is case sensitive", () => {
      const output = "<promise>complete</promise>";
      expect(adapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("isAvailable", () => {
    /**
     * Tests that isAvailable returns a boolean.
     * Function checks if opencode CLI is installed.
     * Note: Actual result depends on system configuration.
     */
    test("returns a boolean promise", async () => {
      const result = await adapter.isAvailable();
      expect(typeof result).toBe("boolean");
    });
  });
});

describe("Adapter comparison", () => {
  /**
   * Tests that both adapters use the same completion marker.
   * Consistent completion detection across adapters.
   */
  test("both adapters use same completion marker", async () => {
    const { ClaudeAdapter } = await import("./claude");
    const claude = new ClaudeAdapter();
    const opencode = new OpenCodeAdapter();

    expect(claude.completionMarker).toBe(opencode.completionMarker);
  });

  /**
   * Tests that Claude supports more formats than OpenCode.
   * Claude has richer output format options.
   */
  test("Claude supports more formats than OpenCode", async () => {
    const { ClaudeAdapter } = await import("./claude");
    const claude = new ClaudeAdapter();
    const opencode = new OpenCodeAdapter();

    expect(claude.supportedFormats.length).toBeGreaterThan(
      opencode.supportedFormats.length
    );
  });
});
