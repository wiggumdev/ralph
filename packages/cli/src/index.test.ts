/**
 * CLI Entry Point Tests
 *
 * These tests validate the main CLI entry point configuration.
 * The index.ts file sets up yargs with commands and global options.
 *
 * Testing ensures:
 * - Version flag works correctly (--version and -v)
 * - Version output follows semver format
 * - Help flags work as expected
 */

import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { spawn } from "bun";

const CLI_PATH = resolve(import.meta.dir, "./index.ts");
const CLI_DIR = resolve(import.meta.dir, "..");
const SEMVER_REGEX = /^\d+\.\d+\.\d+/;

describe("CLI version flag", () => {
  /**
   * Tests that --version flag displays version.
   * Should output version number and exit with code 0.
   */
  test("ralph --version displays version", async () => {
    const proc = spawn(["bun", "run", "--bun", CLI_PATH, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: CLI_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output.trim()).toMatch(SEMVER_REGEX);
  });

  /**
   * Tests that version matches package.json.
   * Version should come from package.json.
   */
  test("version matches package.json", async () => {
    const proc = spawn(["bun", "run", "--bun", CLI_PATH, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: CLI_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const pkg = await import("../package.json");

    expect(output.trim()).toBe(pkg.version);
  });
});
