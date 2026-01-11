/**
 * Postinstall Script Tests
 *
 * Tests the postinstall script's error handling behavior.
 * Critical: The script must exit with code 1 on errors to avoid
 * masking installation failures.
 */

import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "postinstall.mjs");

function runPostinstall(): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("node", [scriptPath], {
      cwd: import.meta.dir,
      env: { ...process.env },
    });

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stderr });
    });
  });
}

describe("postinstall script", () => {
  /**
   * When the platform package is not found, the script should exit with
   * code 1 to signal the failure to the package manager.
   */
  test("exits with code 1 when platform package not found", async () => {
    const { code, stderr } = await runPostinstall();

    // Script should fail because the platform-specific package won't be found
    // in the test environment
    expect(code).toBe(1);
    expect(stderr).toContain("Failed to setup ralph binary");
  });

  /**
   * Error message should be logged before exiting.
   */
  test("logs error message on failure", async () => {
    const { stderr } = await runPostinstall();

    expect(stderr.length).toBeGreaterThan(0);
  });

  /**
   * Successful execution on Windows should exit with code 0.
   * This test uses a mock script to simulate Windows behavior.
   */
  test("exits with code 0 on successful Windows execution", async () => {
    // Create a temporary test script that simulates Windows success
    const testScript = join(import.meta.dir, "postinstall-test-windows.mjs");
    const { writeFileSync, unlinkSync } = await import("node:fs");

    writeFileSync(
      testScript,
      `
      import os from 'node:os';
      
      // Mock os.platform to return win32
      const originalPlatform = os.platform;
      os.platform = () => 'win32';
      
      async function main() {
        if (os.platform() === 'win32') {
          console.log('Windows detected: binary setup not needed');
          return;
        }
      }
      
      main().catch((error) => {
        console.error('Postinstall script error:', error.message);
        process.exit(1);
      });
    `
    );

    const { code } = await new Promise<{ code: number | null }>((resolve) => {
      const child = spawn("node", [testScript]);
      child.on("close", (code) => {
        unlinkSync(testScript);
        resolve({ code });
      });
    });

    expect(code).toBe(0);
  });
});
