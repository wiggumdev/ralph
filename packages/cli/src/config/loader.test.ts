/**
 * Config Loader Tests
 *
 * These tests ensure the configuration loading system works correctly.
 * The config loader is critical because it:
 * - Merges configuration from multiple sources (defaults, user, project, CLI overrides)
 * - Parses TOML files and handles parse errors gracefully
 * - Provides path utility functions used throughout the application
 *
 * Testing this module prevents configuration-related bugs that could cause
 * the CLI to behave unexpectedly or fail silently with wrong settings.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// We need to test the deepMerge function and path utilities
// Since deepMerge is not exported, we test it indirectly through loadConfig

describe("Config Loader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ralph-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getPlansDir", () => {
    /**
     * Tests that getPlansDir correctly resolves the plans directory path.
     * This is essential for locating PRD and prompt files in the project.
     */
    test("returns resolved path using config plansDir", async () => {
      const { getPlansDir } = await import("./loader");
      const config = {
        adapter: "claude" as const,
        plansDir: ".plans",
        maxIterations: 10,
        verbose: false,
        tui: true,
        showUsage: false,
      };

      const result = getPlansDir(config, "/project");
      expect(result).toBe("/project/.plans");
    });

    /**
     * Tests that custom plansDir values are respected.
     * Users may configure different directory names for their plans.
     */
    test("respects custom plansDir value", async () => {
      const { getPlansDir } = await import("./loader");
      const config = {
        adapter: "claude" as const,
        plansDir: "custom-plans",
        maxIterations: 10,
        verbose: false,
        tui: true,
        showUsage: false,
      };

      const result = getPlansDir(config, "/project");
      expect(result).toBe("/project/custom-plans");
    });
  });

  describe("getPrdPath", () => {
    /**
     * Tests that getPrdPath correctly appends prd.json to the plans directory.
     * The PRD file is the core requirements document that drives the agent.
     */
    test("returns path to prd.json in plans directory", async () => {
      const { getPrdPath } = await import("./loader");
      const config = {
        adapter: "claude" as const,
        plansDir: ".plans",
        maxIterations: 10,
        verbose: false,
        tui: true,
        showUsage: false,
      };

      const result = getPrdPath(config, "/project");
      expect(result).toBe("/project/.plans/prd.json");
    });
  });

  describe("getPromptPath", () => {
    /**
     * Tests that getPromptPath correctly locates the PROMPT.md file.
     * This file contains the system prompt template for the agent.
     */
    test("returns path to PROMPT.md in plans directory", async () => {
      const { getPromptPath } = await import("./loader");
      const config = {
        adapter: "claude" as const,
        plansDir: ".plans",
        maxIterations: 10,
        verbose: false,
        tui: true,
        showUsage: false,
      };

      const result = getPromptPath(config, "/project");
      expect(result).toBe("/project/.plans/PROMPT.md");
    });
  });

  describe("getProgressPath", () => {
    /**
     * Tests that getProgressPath correctly locates the progress tracking file.
     * This file tracks the agent's progress across iterations.
     */
    test("returns path to progress.txt in plans directory", async () => {
      const { getProgressPath } = await import("./loader");
      const config = {
        adapter: "claude" as const,
        plansDir: ".plans",
        maxIterations: 10,
        verbose: false,
        tui: true,
        showUsage: false,
      };

      const result = getProgressPath(config, "/project");
      expect(result).toBe("/project/.plans/progress.txt");
    });
  });
});

describe("deepMerge behavior (tested via config merging)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ralph-merge-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Tests that project config overrides default values.
   * This is the primary configuration pattern - project settings take precedence.
   */
  test("project config overrides defaults", async () => {
    // Create .ralph directory with config
    const ralphDir = join(tempDir, ".ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(
      join(ralphDir, "config.toml"),
      `
adapter = "opencode"
maxIterations = 5
`
    );

    // Import fresh to avoid caching issues
    const { loadConfig } = await import("./loader");
    const config = await loadConfig({ cwd: tempDir });

    expect(config.adapter).toBe("opencode");
    expect(config.maxIterations).toBe(5);
    // Defaults should remain for non-overridden values
    expect(config.plansDir).toBe(".plans");
    expect(config.verbose).toBe(false);
    expect(config.tui).toBe(true);
  });

  /**
   * Tests that CLI overrides take highest precedence.
   * Users should be able to override any setting via command line.
   */
  test("CLI overrides take precedence over project config", async () => {
    // Create project config
    const ralphDir = join(tempDir, ".ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(
      join(ralphDir, "config.toml"),
      `
maxIterations = 5
verbose = false
`
    );

    const { loadConfig } = await import("./loader");
    const config = await loadConfig({
      cwd: tempDir,
      overrides: {
        maxIterations: 20,
        verbose: true,
      },
    });

    expect(config.maxIterations).toBe(20);
    expect(config.verbose).toBe(true);
  });

  /**
   * Tests that undefined override values don't overwrite existing config.
   * This prevents accidental clearing of configuration values.
   */
  test("undefined overrides do not overwrite config", async () => {
    const ralphDir = join(tempDir, ".ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(
      join(ralphDir, "config.toml"),
      `
maxIterations = 15
`
    );

    const { loadConfig } = await import("./loader");
    const config = await loadConfig({
      cwd: tempDir,
      overrides: {
        maxIterations: undefined,
      },
    });

    expect(config.maxIterations).toBe(15);
  });

  /**
   * Tests that missing config files don't cause errors.
   * The loader should gracefully fall back to defaults.
   */
  test("returns defaults when no config files exist", async () => {
    const { loadConfig } = await import("./loader");
    const config = await loadConfig({ cwd: tempDir });

    expect(config.adapter).toBe("claude");
    expect(config.plansDir).toBe(".plans");
    expect(config.maxIterations).toBe(10);
    expect(config.verbose).toBe(false);
    expect(config.tui).toBe(true);
  });
});
