/**
 * Claude Adapter Tests
 *
 * These tests validate the ClaudeAdapter which interfaces with the Claude CLI.
 * The adapter is responsible for:
 * - Building correct command-line arguments for claude CLI
 * - Detecting task completion via the completion marker
 * - Reporting supported output formats (stream-json, text)
 *
 * Testing this module ensures Ralph can correctly invoke Claude CLI
 * and interpret its output for the agent loop.
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { ClaudeAdapter } from "./claude";

describe("ClaudeAdapter", () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
  });

  describe("properties", () => {
    /**
     * Tests that adapter name is 'claude'.
     * Name is used for identification and availability checking.
     */
    test("has correct name", () => {
      expect(adapter.name).toBe("claude");
    });

    /**
     * Tests that completion marker matches expected format.
     * This marker is used to detect when Claude has completed its task.
     */
    test("has correct completion marker", () => {
      expect(adapter.completionMarker).toBe("<promise>COMPLETE</promise>");
    });

    /**
     * Tests that supported formats include stream-json and text.
     * Claude CLI supports both structured and plain output.
     */
    test("supports stream-json and text formats", () => {
      expect(adapter.supportedFormats).toContain("stream-json");
      expect(adapter.supportedFormats).toContain("text");
    });
  });

  describe("buildArgs", () => {
    /**
     * Tests that basic args include claude command and permission mode.
     * Permission mode acceptEdits allows Claude to make file changes.
     */
    test("includes base command and permission mode", () => {
      const args = adapter.buildArgs("Test prompt", {});

      expect(args[0]).toBe("claude");
      expect(args).toContain("--permission-mode");
      expect(args).toContain("acceptEdits");
    });

    /**
     * Tests that prompt is passed with -p flag.
     * The prompt flag passes the user's instruction to Claude.
     */
    test("includes prompt with -p flag", () => {
      const prompt = "Do something useful";
      const args = adapter.buildArgs(prompt, {});

      const promptIndex = args.indexOf("-p");
      expect(promptIndex).toBeGreaterThan(-1);
      expect(args[promptIndex + 1]).toBe(prompt);
    });

    /**
     * Tests that stream-json format adds output-format and verbose flags.
     * Stream-json mode requires verbose for full message output.
     */
    test("adds stream-json output format flags", () => {
      const args = adapter.buildArgs("Prompt", { outputFormat: "stream-json" });

      expect(args).toContain("--output-format");
      expect(args).toContain("stream-json");
      expect(args).toContain("--verbose");
    });

    /**
     * Tests that text format doesn't add output-format flags.
     * Text mode is the default Claude CLI behavior.
     */
    test("does not add output-format for text mode", () => {
      const args = adapter.buildArgs("Prompt", { outputFormat: "text" });

      expect(args).not.toContain("--output-format");
      expect(args).not.toContain("stream-json");
    });

    /**
     * Tests that verbose option adds debug flag.
     * Debug flag provides additional logging output.
     */
    test("adds debug flag when verbose is true", () => {
      const args = adapter.buildArgs("Prompt", { verbose: true });

      expect(args).toContain("--debug");
    });

    /**
     * Tests that verbose false doesn't add debug flag.
     * Default should not include debug output.
     */
    test("does not add debug flag when verbose is false", () => {
      const args = adapter.buildArgs("Prompt", { verbose: false });

      expect(args).not.toContain("--debug");
    });

    /**
     * Tests that all options can be combined correctly.
     * Real usage often combines multiple options.
     */
    test("combines multiple options correctly", () => {
      const args = adapter.buildArgs("Complex prompt", {
        outputFormat: "stream-json",
        verbose: true,
      });

      expect(args).toContain("claude");
      expect(args).toContain("--permission-mode");
      expect(args).toContain("acceptEdits");
      expect(args).toContain("--output-format");
      expect(args).toContain("stream-json");
      expect(args).toContain("--verbose");
      expect(args).toContain("--debug");
      expect(args).toContain("-p");
      expect(args).toContain("Complex prompt");
    });

    /**
     * Tests that prompts with special characters are preserved.
     * Prompts may contain quotes, newlines, etc.
     */
    test("preserves special characters in prompt", () => {
      const prompt = 'Do "this" and \'that\'\nWith newlines';
      const args = adapter.buildArgs(prompt, {});

      const promptIndex = args.indexOf("-p");
      expect(args[promptIndex + 1]).toBe(prompt);
    });

    /**
     * Tests that empty prompt is passed correctly.
     * Edge case that shouldn't break arg building.
     */
    test("handles empty prompt", () => {
      const args = adapter.buildArgs("", {});

      const promptIndex = args.indexOf("-p");
      expect(promptIndex).toBeGreaterThan(-1);
      expect(args[promptIndex + 1]).toBe("");
    });

    /**
     * Tests that cwd option is ignored (not passed to claude).
     * cwd is used by Ralph internally, not passed to CLI.
     */
    test("ignores cwd option", () => {
      const args = adapter.buildArgs("Prompt", { cwd: "/some/path" });

      expect(args).not.toContain("/some/path");
      expect(args).not.toContain("--cwd");
    });
  });

  describe("detectCompletion", () => {
    /**
     * Tests that completion marker is detected in output.
     * Exact marker match triggers completion.
     */
    test("returns true when marker is present", () => {
      const output = "Working... done!\n<promise>COMPLETE</promise>";
      expect(adapter.detectCompletion(output)).toBe(true);
    });

    /**
     * Tests that missing marker returns false.
     * No marker means task is not complete.
     */
    test("returns false when marker is absent", () => {
      const output = "Working... still going...";
      expect(adapter.detectCompletion(output)).toBe(false);
    });

    /**
     * Tests that partial marker doesn't trigger completion.
     * Only exact match should work.
     */
    test("returns false for partial marker", () => {
      const output = "<promise>COMPL";
      expect(adapter.detectCompletion(output)).toBe(false);
    });

    /**
     * Tests that marker anywhere in output is detected.
     * Marker may appear mid-stream.
     */
    test("detects marker anywhere in output", () => {
      const output = "Start\n<promise>COMPLETE</promise>\nMore text";
      expect(adapter.detectCompletion(output)).toBe(true);
    });

    /**
     * Tests that empty output returns false.
     * No output means not complete.
     */
    test("returns false for empty output", () => {
      expect(adapter.detectCompletion("")).toBe(false);
    });
  });

  describe("isAvailable", () => {
    /**
     * Tests that isAvailable returns a boolean.
     * Function checks if claude CLI is installed.
     * Note: Actual result depends on system configuration.
     */
    test("returns a boolean promise", async () => {
      const result = await adapter.isAvailable();
      expect(typeof result).toBe("boolean");
    });
  });
});
