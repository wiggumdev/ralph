/**
 * Hook Executor Tests
 *
 * Tests for the HookExecutor class which runs shell commands at various
 * lifecycle events during the Ralph agent loop. Hooks receive environment
 * variables with context about the current state.
 *
 * Hook types:
 * - ralph_start: Called when Ralph begins (with task count and max iterations)
 * - ralph_loop_start: Called at start of each iteration
 * - ralph_loop_end: Called at end of each iteration
 * - ralph_complete: Called when task completes successfully
 * - ralph_max_iterations: Called when max iterations reached
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHookExecutor, HookExecutor } from "./executor";

describe("HookExecutor", () => {
  let tempDir: string;
  let outputFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ralph-hook-test-"));
    outputFile = join(tempDir, "hook-output.txt");
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  describe("createHookExecutor", () => {
    /**
     * Tests that factory function creates HookExecutor instance.
     */
    test("creates HookExecutor instance", () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      expect(executor).toBeInstanceOf(HookExecutor);
    });

    /**
     * Tests that verbose defaults to false.
     */
    test("defaults verbose to false", () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      expect(executor).toBeInstanceOf(HookExecutor);
    });
  });

  describe("executeRalphStart", () => {
    /**
     * Tests that ralph_start hook executes with correct env vars.
     */
    test("executes hook with correct environment variables", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_start: `echo "CWD=$RALPH_CWD TASKS=$RALPH_TASKS_NOT_PASSING MAX=$RALPH_MAX_ITERATIONS" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphStart(5, 10);

      expect(existsSync(outputFile)).toBe(true);
      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe(`CWD=${tempDir} TASKS=5 MAX=10`);
    });

    /**
     * Tests that missing hook is skipped without error.
     */
    test("skips execution when hook not configured", async () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      // Should not throw
      await executor.executeRalphStart(5, 10);
      expect(existsSync(outputFile)).toBe(false);
    });

    /**
     * Tests that zero values are passed correctly.
     */
    test("handles zero values", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_start: `echo "$RALPH_TASKS_NOT_PASSING,$RALPH_MAX_ITERATIONS" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphStart(0, 0);

      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe("0,0");
    });
  });

  describe("executeRalphLoopStart", () => {
    /**
     * Tests that ralph_loop_start hook executes with iteration number.
     */
    test("executes hook with iteration number", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_loop_start: `echo "ITER=$RALPH_LOOP_ITERATION CWD=$RALPH_CWD" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphLoopStart(3);

      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe(`ITER=3 CWD=${tempDir}`);
    });

    /**
     * Tests that hook skipped when not configured.
     */
    test("skips execution when hook not configured", async () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      await executor.executeRalphLoopStart(1);
      expect(existsSync(outputFile)).toBe(false);
    });
  });

  describe("executeRalphLoopEnd", () => {
    /**
     * Tests that ralph_loop_end hook executes with iteration number.
     */
    test("executes hook with iteration number", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_loop_end: `echo "END_ITER=$RALPH_LOOP_ITERATION" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphLoopEnd(7);

      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe("END_ITER=7");
    });

    /**
     * Tests that hook skipped when not configured.
     */
    test("skips execution when hook not configured", async () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      await executor.executeRalphLoopEnd(1);
      expect(existsSync(outputFile)).toBe(false);
    });
  });

  describe("executeRalphComplete", () => {
    /**
     * Tests that ralph_complete hook executes with total iterations.
     */
    test("executes hook with total iterations", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_complete: `echo "TOTAL=$RALPH_TOTAL_ITERATIONS" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphComplete(4);

      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe("TOTAL=4");
    });

    /**
     * Tests that hook skipped when not configured.
     */
    test("skips execution when hook not configured", async () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      await executor.executeRalphComplete(4);
      expect(existsSync(outputFile)).toBe(false);
    });
  });

  describe("executeRalphMaxIterations", () => {
    /**
     * Tests that ralph_max_iterations hook executes with total iterations.
     */
    test("executes hook with total iterations", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_max_iterations: `echo "MAX_REACHED=$RALPH_TOTAL_ITERATIONS" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphMaxIterations(10);

      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe("MAX_REACHED=10");
    });

    /**
     * Tests that hook skipped when not configured.
     */
    test("skips execution when hook not configured", async () => {
      const executor = createHookExecutor({
        hooks: {},
        cwd: tempDir,
      });

      await executor.executeRalphMaxIterations(10);
      expect(existsSync(outputFile)).toBe(false);
    });
  });

  describe("hook execution", () => {
    /**
     * Tests that hooks run in specified cwd.
     */
    test("runs hook in specified cwd", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_start: `pwd > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphStart(0, 1);

      const output = readFileSync(outputFile, "utf-8").trim();
      // Handle macOS symlink: /var -> /private/var
      expect(output.replace("/private", "")).toBe(
        tempDir.replace("/private", "")
      );
    });

    /**
     * Tests that hook failures don't throw (non-blocking).
     */
    test("handles hook failure gracefully", async () => {
      const executor = createHookExecutor({
        hooks: {
          ralph_start: "exit 1",
        },
        cwd: tempDir,
      });

      // Should not throw even with non-zero exit
      await executor.executeRalphStart(0, 1);
    });

    /**
     * Tests that multiple hooks can be configured independently.
     */
    test("supports multiple independent hooks", async () => {
      const startFile = join(tempDir, "start.txt");
      const endFile = join(tempDir, "end.txt");

      const executor = createHookExecutor({
        hooks: {
          ralph_loop_start: `echo "started" > ${startFile}`,
          ralph_loop_end: `echo "ended" > ${endFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphLoopStart(1);
      expect(existsSync(startFile)).toBe(true);
      expect(existsSync(endFile)).toBe(false);

      await executor.executeRalphLoopEnd(1);
      expect(existsSync(endFile)).toBe(true);
    });

    /**
     * Tests that hooks inherit process.env.
     */
    test("inherits process environment variables", async () => {
      const testEnvVar = `RALPH_TEST_${Date.now()}`;
      process.env[testEnvVar] = "inherited_value";

      const executor = createHookExecutor({
        hooks: {
          ralph_start: `echo "$${testEnvVar}" > ${outputFile}`,
        },
        cwd: tempDir,
      });

      await executor.executeRalphStart(0, 1);

      const output = readFileSync(outputFile, "utf-8").trim();
      expect(output).toBe("inherited_value");

      delete process.env[testEnvVar];
    });
  });
});
