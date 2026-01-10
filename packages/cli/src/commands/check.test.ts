/**
 * Check Command Tests
 *
 * These tests validate the check command's configuration and functionality.
 * The check command validates prd.json against the PRD schema to ensure:
 * - All features have required fields
 * - Acceptance criteria are properly formatted
 * - The PRD is ready for agent execution
 *
 * Testing this command ensures:
 * - Command metadata is correct
 * - Builder configures options properly
 * - PRD validation integration works correctly
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCommand } from "./check";

describe("check command", () => {
  describe("command metadata", () => {
    /**
     * Tests that command name is correct.
     * Used for help output and command matching.
     */
    test("has correct command name", () => {
      expect(checkCommand.command).toBe("check");
    });

    /**
     * Tests that description is provided and mentions prd.json.
     * Shown in --help output.
     */
    test("has description mentioning prd.json", () => {
      expect(checkCommand.describe).toBeDefined();
      expect(typeof checkCommand.describe).toBe("string");
      expect(checkCommand.describe).toContain("prd.json");
    });

    /**
     * Tests that handler is a function.
     * Handler executes the command logic.
     */
    test("has handler function", () => {
      expect(typeof checkCommand.handler).toBe("function");
    });

    /**
     * Tests that builder is defined.
     * Builder configures command options.
     */
    test("has builder function", () => {
      expect(typeof checkCommand.builder).toBe("function");
    });
  });

  describe("builder configuration", () => {
    /**
     * Tests that --cwd option is configured.
     * Allows checking PRD in a different directory.
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
      checkCommand.builder(mockYargs);

      expect(options).toHaveProperty("cwd");
      expect((options.cwd as { alias: string }).alias).toBe("c");
      expect((options.cwd as { type: string }).type).toBe("string");
    });
  });
});

describe("check command PRD validation integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ralph-check-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Tests the validation flow with a valid PRD.
   * This is a functional test of the validation integration.
   */
  test("validatePrd accepts correctly structured PRD", async () => {
    const validPrd = [
      {
        category: "Core",
        title: "Test Feature",
        description: "A test feature",
        passes: false,
        acceptance: ["Criterion 1"],
      },
    ];

    const { validatePrd } = await import("#schema/prd");
    const result = validatePrd(validPrd);

    expect(result.valid).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  /**
   * Tests that invalid PRD is rejected.
   * The check command should report validation errors.
   */
  test("validatePrd rejects invalid PRD structure", async () => {
    const invalidPrd = [
      {
        category: "Core",
        // Missing required fields: title, description, passes, acceptance
      },
    ];

    const { validatePrd } = await import("#schema/prd");
    const result = validatePrd(invalidPrd);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  /**
   * Tests that empty array PRD is rejected.
   * PRD must have at least one feature.
   */
  test("validatePrd rejects empty PRD array", async () => {
    const { validatePrd } = await import("#schema/prd");
    const result = validatePrd([]);

    expect(result.valid).toBe(false);
  });

  /**
   * Tests that PRD with multiple features validates correctly.
   * Real PRDs often have many features.
   */
  test("validatePrd accepts multiple features", async () => {
    const multiFeaturePrd = [
      {
        category: "Auth",
        title: "Login",
        description: "User login",
        passes: true,
        acceptance: ["Form works"],
      },
      {
        category: "Auth",
        title: "Logout",
        description: "User logout",
        passes: false,
        acceptance: ["Button works", "Session cleared"],
      },
    ];

    const { validatePrd } = await import("#schema/prd");
    const result = validatePrd(multiFeaturePrd);

    expect(result.valid).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
