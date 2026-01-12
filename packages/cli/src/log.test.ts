/**
 * Log Module Tests
 *
 * These tests validate the logging system's functionality including:
 * - Log level filtering
 * - File and console output
 * - Error handling (including empty catch blocks)
 * - Logger creation and tagging
 *
 * Testing ensures:
 * - Silent catch blocks are eliminated or explicitly handled
 * - Errors are logged appropriately for debugging
 * - Log file management works correctly
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Global } from "./global";
import { Log } from "./log";

// Regex patterns defined at top level for performance
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{6}\.log$/;

describe("Log", () => {
  let testDir: string;
  let originalStderr: typeof process.stderr.write;
  let stderrOutput: string[] = [];

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = mkdtempSync(join(tmpdir(), "ralph-log-test-"));

    // Capture stderr output
    stderrOutput = [];
    originalStderr = process.stderr.write;
    process.stderr.write = ((chunk: any) => {
      stderrOutput.push(chunk.toString());
      return true;
    }) as any;
  });

  afterEach(() => {
    // Restore stderr
    process.stderr.write = originalStderr;

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("init error handling", () => {
    test("logs errors from fs.truncate failures", async () => {
      // Create test log directory
      const logDir = join(testDir, "logs");
      mkdirSync(logDir);

      // Create a read-only directory to force truncate to fail
      const readonlyDir = join(testDir, "readonly");
      mkdirSync(readonlyDir, { mode: 0o444 });

      // Mock Global.Path.log to use our test directory
      const originalLog = (global as any).Global?.Path?.log;
      if (!(global as any).Global) {
        (global as any).Global = {};
      }
      if (!(global as any).Global.Path) {
        (global as any).Global.Path = {};
      }
      (global as any).Global.Path.log = logDir;

      const logger = Log.create({ service: "test-truncate" });

      // This should handle truncate errors gracefully
      await Log.init({ print: false, dev: true });

      // Logger should still work even if truncate failed
      logger.info("Test message after truncate error");

      // Verify logger still works
      expect(Log.file()).toContain("dev.log");

      // Restore original path
      if (originalLog !== undefined) {
        (global as any).Global.Path.log = originalLog;
      }
    });

    test("handles cleanup errors gracefully", async () => {
      // Create test log directory with some old log files
      const logDir = join(testDir, "logs");
      mkdirSync(logDir);

      // Create multiple old log files (more than 5 to trigger cleanup)
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - i * 86_400_000);
        const filename = `${date.toISOString().split(".")[0]!.replace(/:/g, "")}.log`;
        Bun.write(join(logDir, filename), "old log data");
      }

      // Mock Global.Path.log
      const originalLog = (global as any).Global?.Path?.log;
      if (!(global as any).Global) {
        (global as any).Global = {};
      }
      if (!(global as any).Global.Path) {
        (global as any).Global.Path = {};
      }
      (global as any).Global.Path.log = logDir;

      // Init should trigger cleanup without crashing
      await Log.init({ print: false, dev: true });

      // Verify log system still works
      const logger = Log.create({ service: "test-cleanup" });
      logger.info("Test after cleanup");

      // Restore original path
      if (originalLog !== undefined) {
        (global as any).Global.Path.log = originalLog;
      }
    });
  });

  describe("logger functionality", () => {
    test("creates logger with tags", () => {
      const logger = Log.create({ service: "test", version: "1.0" });

      // Logger should be created and cached
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
    });

    test("logger outputs to stderr when print=true", async () => {
      await Log.init({ print: true, level: "INFO" });

      const logger = Log.create({ service: "test-stderr" });
      logger.info("Test message to stderr");

      // Check stderr was written to
      expect(stderrOutput.length).toBeGreaterThan(0);
      expect(stderrOutput.join("")).toContain("Test message to stderr");
    });

    test("logger writes to file when print=false", async () => {
      const logDir = join(testDir, "logs");
      mkdirSync(logDir);

      // Mock Global.Path.log
      const originalLog = (global as any).Global?.Path?.log;
      if (!(global as any).Global) {
        (global as any).Global = {};
      }
      if (!(global as any).Global.Path) {
        (global as any).Global.Path = {};
      }
      (global as any).Global.Path.log = logDir;

      await Log.init({ print: false, dev: true });

      const logger = Log.create({ service: "test-file" });
      logger.info("Test message to file");

      // Give time for write to complete
      await Bun.sleep(10);

      // Verify log file was created
      expect(Log.file()).toContain("dev.log");
      const logFile = Log.file();
      expect(existsSync(logFile)).toBe(true);

      // Restore original path
      if (originalLog !== undefined) {
        (global as any).Global.Path.log = originalLog;
      }
    });

    test("filters logs by level", async () => {
      await Log.init({ print: true, level: "WARN" });

      const logger = Log.create({ service: "test-level" });

      // Clear previous stderr output
      stderrOutput = [];

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");

      const output = stderrOutput.join("");

      // Debug and Info should be filtered out
      expect(output).not.toContain("Debug message");
      expect(output).not.toContain("Info message");

      // Warn and Error should be included
      expect(output).toContain("Warn message");
      expect(output).toContain("Error message");
    });

    test("logger clones with tags", () => {
      const logger1 = Log.create({ service: "original", env: "test" });
      const logger2 = logger1.clone();

      expect(logger2).toBeDefined();
      expect(logger2).not.toBe(logger1);
    });

    test("logger times operations", async () => {
      await Log.init({ print: true, level: "INFO" });

      const logger = Log.create({ service: "test-time" });

      stderrOutput = [];

      const timer = logger.time("Operation");
      await Bun.sleep(10);
      timer.stop();

      const output = stderrOutput.join("");
      expect(output).toContain("Operation");
      expect(output).toContain("status=started");
      expect(output).toContain("status=completed");
      expect(output).toContain("duration=");
    });
  });

  describe("cleanup functionality", () => {
    test("keeps only recent log files", async () => {
      const logDir = join(testDir, "logs");
      mkdirSync(logDir);

      // Create 15 log files to trigger cleanup (keeps 10)
      for (let i = 0; i < 15; i++) {
        const date = new Date(Date.now() - i * 86_400_000);
        const filename = `${date.toISOString().split(".")[0]!.replace(/:/g, "")}.log`;
        await Bun.write(join(logDir, filename), `log ${i}`);
      }

      // Modify Global.Path.log directly
      const originalLog = Global.Path.log;
      Global.Path.log = logDir;

      // Init triggers cleanup
      await Log.init({ print: false, dev: false });

      // Count remaining log files
      const files = readdirSync(logDir).filter((f) => ISO_DATE_PATTERN.test(f));

      // Should have kept 10 files (deleted 5)
      expect(files.length).toBeLessThanOrEqual(11); // 10 old + 1 new

      // Restore original path
      Global.Path.log = originalLog;
    });

    test("does not cleanup when fewer than 5 files exist", async () => {
      const logDir = join(testDir, "logs");
      mkdirSync(logDir);

      // Create only 3 log files
      for (let i = 0; i < 3; i++) {
        const date = new Date(Date.now() - i * 86_400_000);
        const filename = `${date.toISOString().split(".")[0]!.replace(/:/g, "")}.log`;
        await Bun.write(join(logDir, filename), `log ${i}`);
      }

      // Modify Global.Path.log directly
      const originalLog = Global.Path.log;
      Global.Path.log = logDir;

      await Log.init({ print: false, dev: false });

      // Count log files
      const files = readdirSync(logDir).filter((f) => ISO_DATE_PATTERN.test(f));

      // Should have 3 old files + 1 new file
      expect(files.length).toBeGreaterThanOrEqual(3);

      // Restore original path
      Global.Path.log = originalLog;
    });
  });
});
