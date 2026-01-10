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
import { initCommand } from "./init";

describe("init command", () => {
  describe("command metadata", () => {
    /**
     * Tests that command name is correct.
     * Used for help output and command matching.
     */
    test("has correct command name", () => {
      expect(initCommand.command).toBe("init");
    });

    /**
     * Tests that description is provided.
     * Shown in --help output.
     */
    test("has description", () => {
      expect(initCommand.describe).toBeDefined();
      expect(typeof initCommand.describe).toBe("string");
    });

    /**
     * Tests that handler is a function.
     * Handler executes the command logic.
     */
    test("has handler function", () => {
      expect(typeof initCommand.handler).toBe("function");
    });

    /**
     * Tests that builder is defined.
     * Builder configures command options.
     */
    test("has builder function", () => {
      expect(typeof initCommand.builder).toBe("function");
    });
  });

  describe("builder configuration", () => {
    /**
     * Tests that builder configures expected options.
     * We test the builder by calling it with a mock yargs.
     */
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

    /**
     * Tests that --force option is configured.
     * Force allows overwriting existing files.
     */
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
});
