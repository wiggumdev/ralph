/**
 * Init Command Tests
 *
 * These tests validate the init command's configuration and builder.
 * The init command sets up a new Ralph project with:
 * - Configuration directory (.ralph/)
 * - Plans directory with PRD template
 * - Prompt template file
 * - Progress tracking file
 *
 * Testing this command ensures:
 * - Command metadata is correct
 * - Builder configures options properly
 * - Handler is properly defined
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { initCommand } from "./init";

// Path to init.ts source for content-based tests
const INIT_SOURCE_PATH = path.join(import.meta.dir, "init.ts");
const initSource = readFileSync(INIT_SOURCE_PATH, "utf-8");

// Regex patterns for source code validation (defined at top level for performance)
const CHOICE_3_PATTERN = /choice\s*===\s*["']3["']/;
const RETURN_GEMINI_PATTERN = /return\s*["']gemini["']/;
const CHOICE_4_PATTERN = /choice\s*===\s*["']4["']/;
const RETURN_COPILOT_PATTERN = /return\s*["']copilot["']/;

describe("init command", () => {
  describe("command metadata", () => {
    test("has correct command name", () => {
      expect(initCommand.command).toBe("init");
    });

    test("has description", () => {
      expect(initCommand.describe).toBeDefined();
      expect(typeof initCommand.describe).toBe("string");
    });

    test("has handler function", () => {
      expect(typeof initCommand.handler).toBe("function");
    });

    test("has builder function", () => {
      expect(typeof initCommand.builder).toBe("function");
    });
  });

  describe("builder configuration", () => {
    test("configures --cwd option", () => {
      const options: Record<string, unknown> = {};
      const mockYargs = {
        option: (name: string, config: unknown) => {
          options[name] = config;
          return mockYargs;
        },
      };

      // @ts-expect-error Using mock yargs
      initCommand.builder(mockYargs);

      expect(options).toHaveProperty("cwd");
      expect((options.cwd as { alias: string }).alias).toBe("c");
      expect((options.cwd as { type: string }).type).toBe("string");
    });

    test("configures --force option", () => {
      const options: Record<string, unknown> = {};
      const mockYargs = {
        option: (name: string, config: unknown) => {
          options[name] = config;
          return mockYargs;
        },
      };

      // @ts-expect-error Using mock yargs
      initCommand.builder(mockYargs);

      expect(options).toHaveProperty("force");
      expect((options.force as { alias: string }).alias).toBe("f");
      expect((options.force as { type: string }).type).toBe("boolean");
      expect((options.force as { default: boolean }).default).toBe(false);
    });
  });

  describe("adapter selection", () => {
    test("selectAdapter includes gemini option", () => {
      expect(initSource).toContain("gemini");
      expect(initSource).toContain("3. gemini");
    });

    test("selectAdapter includes copilot option", () => {
      expect(initSource).toContain("copilot");
      expect(initSource).toContain("4. copilot");
    });

    test("selectAdapter lists all four adapters", () => {
      expect(initSource).toContain("claude (Claude Code CLI)");
      expect(initSource).toContain("opencode (OpenCode CLI)");
      expect(initSource).toContain("gemini (Gemini CLI)");
      expect(initSource).toContain("copilot (GitHub Copilot CLI)");
    });

    test("selectAdapter returns gemini for choice 3", () => {
      // Verify the choice mapping logic exists in source
      expect(initSource).toMatch(CHOICE_3_PATTERN);
      expect(initSource).toMatch(RETURN_GEMINI_PATTERN);
    });

    test("selectAdapter returns copilot for choice 4", () => {
      expect(initSource).toMatch(CHOICE_4_PATTERN);
      expect(initSource).toMatch(RETURN_COPILOT_PATTERN);
    });
  });
});
