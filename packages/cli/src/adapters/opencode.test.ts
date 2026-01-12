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

import { beforeEach, describe, expect, test } from "bun:test";
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
     * Tests that supported formats include text and opencode-json.
     * OpenCode CLI supports its own JSON format.
     */
    test("supports text and opencode-json formats", () => {
      expect(adapter.supportedFormats).toContain("text");
      expect(adapter.supportedFormats).toContain("opencode-json");
      expect(adapter.supportedFormats).not.toContain("stream-json");
      expect(adapter.supportedFormats).toHaveLength(2);
    });
  });

  describe("buildArgs", () => {
    /**
     * Tests that basic args include opencode command and run subcommand.
     * Uses 'opencode run' for automated execution.
     */
    test("includes base command and run subcommand", () => {
      const args = adapter.buildArgs("Test prompt", {});

      expect(args[0]).toBe("opencode");
      expect(args[1]).toBe("run");
    });

    /**
     * Tests that prompt is passed as the last argument.
     * OpenCode run takes prompt as positional argument.
     */
    test("includes prompt as last argument", () => {
      const prompt = "Do something useful";
      const args = adapter.buildArgs(prompt, {});

      expect(args.at(-1)).toBe(prompt);
    });

    /**
     * Tests that verbose option adds --print-logs flag.
     * Print-logs flag provides additional logging output.
     */
    test("adds --print-logs flag when verbose is true", () => {
      const args = adapter.buildArgs("Prompt", { verbose: true });

      expect(args).toContain("--print-logs");
    });

    /**
     * Tests that verbose false doesn't add --print-logs flag.
     * Default should not include verbose output.
     */
    test("does not add --print-logs flag when verbose is false", () => {
      const args = adapter.buildArgs("Prompt", { verbose: false });

      expect(args).not.toContain("--print-logs");
    });

    /**
     * Tests that opencode-json format adds --format json flag.
     * OpenCode supports its own JSON format.
     */
    test("adds --format json for opencode-json format", () => {
      const args = adapter.buildArgs("Prompt", {
        outputFormat: "opencode-json",
      });

      expect(args).toContain("--format");
      expect(args).toContain("json");
    });

    /**
     * Tests that text format doesn't add format flag.
     * Text is the default output.
     */
    test("does not add format flag for text format", () => {
      const args = adapter.buildArgs("Prompt", { outputFormat: "text" });

      expect(args).not.toContain("--format");
    });

    /**
     * Tests that all options can be combined correctly.
     * Real usage may set multiple options.
     */
    test("combines options correctly", () => {
      const args = adapter.buildArgs("Complex prompt", {
        verbose: true,
        outputFormat: "opencode-json",
      });

      expect(args).toContain("opencode");
      expect(args).toContain("run");
      expect(args).toContain("--print-logs");
      expect(args).toContain("--format");
      expect(args.at(-1)).toBe("Complex prompt");
    });

    /**
     * Tests that prompts with special characters are preserved.
     * Prompts may contain quotes, newlines, etc.
     */
    test("preserves special characters in prompt", () => {
      const prompt = 'Create a "test" with\nmultiple lines';
      const args = adapter.buildArgs(prompt, {});

      expect(args.at(-1)).toBe(prompt);
    });

    /**
     * Tests that empty prompt is passed correctly.
     * Edge case that shouldn't break arg building.
     */
    test("handles empty prompt", () => {
      const args = adapter.buildArgs("", {});

      expect(args.at(-1)).toBe("");
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
     * Command should come first, then flags, then prompt.
     */
    test("maintains correct argument order", () => {
      const args = adapter.buildArgs("Prompt", { verbose: true });

      // opencode should be first
      expect(args[0]).toBe("opencode");
      // run should be second
      expect(args[1]).toBe("run");
      // prompt should be at the end
      expect(args.at(-1)).toBe("Prompt");
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
   * Tests that both adapters support the same number of formats.
   * Both now support 2 formats each.
   */
  test("both adapters support same number of formats", async () => {
    const { ClaudeAdapter } = await import("./claude");
    const claude = new ClaudeAdapter();
    const opencode = new OpenCodeAdapter();

    expect(claude.supportedFormats.length).toBe(
      opencode.supportedFormats.length
    );
  });
});
