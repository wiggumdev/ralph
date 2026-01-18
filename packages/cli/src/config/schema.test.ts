/**
 * Config Schema Tests
 *
 * These tests validate the configuration schema used by the CLI.
 * The schema is critical because it:
 * - Defines valid adapter types (claude, opencode)
 * - Enforces constraints on configuration values (positive integers, etc.)
 * - Provides sensible defaults for all configuration options
 *
 * Testing this module ensures configuration validation catches invalid
 * settings early, preventing runtime errors from malformed config.
 */

import { describe, expect, test } from "bun:test";
import { AdapterType, ConfigSchema, DEFAULT_CONFIG } from "./schema";

describe("AdapterType", () => {
  /**
   * Tests that 'claude' is a valid adapter type.
   * Claude is the primary adapter for this tool.
   */
  test("accepts 'claude' as valid adapter", () => {
    const result = AdapterType.safeParse("claude");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("claude");
    }
  });

  /**
   * Tests that 'opencode' is a valid adapter type.
   * OpenCode is an alternative adapter for different CLI backends.
   */
  test("accepts 'opencode' as valid adapter", () => {
    const result = AdapterType.safeParse("opencode");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("opencode");
    }
  });

  /**
   * Tests that unknown adapter types are rejected.
   * This prevents typos and invalid configurations from causing issues.
   */
  test("rejects unknown adapter types", () => {
    const result = AdapterType.safeParse("unknown-adapter");
    expect(result.success).toBe(false);
  });

  /**
   * Tests that empty strings are rejected as adapter type.
   * Empty values should not be accepted as valid configuration.
   */
  test("rejects empty string", () => {
    const result = AdapterType.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("ConfigSchema", () => {
  /**
   * Tests that a complete valid configuration passes validation.
   * This represents the expected structure of user configurations.
   */
  test("accepts valid complete config", () => {
    const config = {
      adapter: "claude" as const,
      plansDir: ".plans",
      maxIterations: 10,
      debug: false,
      tui: true,
      showUsage: false,
      yolo: false,
      hooks: {},
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(config);
    }
  });

  /**
   * Tests that empty objects receive all default values.
   * This is the most common case when users have minimal config.
   */
  test("applies defaults for empty object", () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adapter).toBe("claude");
      expect(result.data.plansDir).toBe(".plans");
      expect(result.data.maxIterations).toBe(10);
      expect(result.data.debug).toBe(false);
      expect(result.data.tui).toBe(true);
      expect(result.data.showUsage).toBe(false);
    }
  });

  /**
   * Tests that partial configs receive defaults for missing fields.
   * Users should only need to specify values they want to change.
   */
  test("applies defaults for partial config", () => {
    const result = ConfigSchema.safeParse({
      adapter: "opencode",
      maxIterations: 5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adapter).toBe("opencode");
      expect(result.data.maxIterations).toBe(5);
      // Defaults applied
      expect(result.data.plansDir).toBe(".plans");
      expect(result.data.debug).toBe(false);
      expect(result.data.tui).toBe(true);
      expect(result.data.showUsage).toBe(false);
    }
  });

  describe("maxIterations validation", () => {
    /**
     * Tests that maxIterations must be a positive integer.
     * Zero iterations would prevent the agent from running at all.
     */
    test("rejects zero maxIterations", () => {
      const result = ConfigSchema.safeParse({
        maxIterations: 0,
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that negative iteration counts are rejected.
     * Negative values have no semantic meaning for iteration counts.
     */
    test("rejects negative maxIterations", () => {
      const result = ConfigSchema.safeParse({
        maxIterations: -5,
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that floating point iteration counts are rejected.
     * Iterations must be whole numbers.
     */
    test("rejects non-integer maxIterations", () => {
      const result = ConfigSchema.safeParse({
        maxIterations: 3.5,
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that valid positive integers are accepted.
     * This is the expected input for iteration counts.
     */
    test("accepts positive integer maxIterations", () => {
      const result = ConfigSchema.safeParse({
        maxIterations: 100,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxIterations).toBe(100);
      }
    });
  });

  describe("plansDir validation", () => {
    /**
     * Tests that custom directory names are accepted.
     * Users may want to use different directory names for organization.
     */
    test("accepts custom plansDir value", () => {
      const result = ConfigSchema.safeParse({
        plansDir: "my-custom-plans",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plansDir).toBe("my-custom-plans");
      }
    });

    /**
     * Tests that paths with subdirectories are accepted.
     * Users might want to nest their plans in a deeper directory structure.
     */
    test("accepts nested plansDir path", () => {
      const result = ConfigSchema.safeParse({
        plansDir: "docs/plans",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plansDir).toBe("docs/plans");
      }
    });
  });

  describe("boolean flags", () => {
    /**
     * Tests that debug mode can be enabled.
     * This controls debug logging to file.
     */
    test("accepts debug true", () => {
      const result = ConfigSchema.safeParse({ debug: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.debug).toBe(true);
      }
    });

    /**
     * Tests that TUI can be disabled.
     * Some users may prefer plain text output.
     */
    test("accepts tui false", () => {
      const result = ConfigSchema.safeParse({ tui: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tui).toBe(false);
      }
    });
  });
});

describe("DEFAULT_CONFIG", () => {
  /**
   * Tests that DEFAULT_CONFIG matches the schema defaults.
   * This ensures consistency between the exported constant and schema behavior.
   */
  test("matches schema defaults", () => {
    const schemaDefaults = ConfigSchema.parse({});
    expect(DEFAULT_CONFIG).toEqual(schemaDefaults);
  });

  /**
   * Tests that DEFAULT_CONFIG has all expected properties.
   * This catches missing properties in the default configuration.
   */
  test("has all required properties", () => {
    expect(DEFAULT_CONFIG).toHaveProperty("adapter");
    expect(DEFAULT_CONFIG).toHaveProperty("plansDir");
    expect(DEFAULT_CONFIG).toHaveProperty("maxIterations");
    expect(DEFAULT_CONFIG).toHaveProperty("debug");
    expect(DEFAULT_CONFIG).toHaveProperty("tui");
    expect(DEFAULT_CONFIG).toHaveProperty("showUsage");
    expect(DEFAULT_CONFIG).toHaveProperty("hooks");
  });

  /**
   * Tests that DEFAULT_CONFIG is a valid configuration.
   * The default config should always pass schema validation.
   */
  test("passes schema validation", () => {
    const result = ConfigSchema.safeParse(DEFAULT_CONFIG);
    expect(result.success).toBe(true);
  });
});
