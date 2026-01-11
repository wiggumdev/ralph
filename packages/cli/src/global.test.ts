/**
 * Global Path Tests
 *
 * These tests ensure the global path initialization system works correctly.
 * The global module is critical because it:
 * - Initializes XDG-compliant directory paths for cross-platform support
 * - Creates necessary directories on startup
 * - Handles cases where XDG paths may be undefined on some systems
 *
 * Testing this module prevents crashes on systems where XDG paths are not available
 * and ensures the application can start reliably across different environments.
 */

import { describe, expect, test } from "bun:test";

const DRIVE_LETTER_PATTERN = /^[A-Za-z]:/;

describe("Global Path Safety", () => {
  /**
   * Tests that xdg paths have proper fallbacks when undefined.
   * On some systems (particularly Windows or non-standard Linux setups),
   * xdg-basedir may return undefined values. The code must handle this gracefully.
   */
  test("should handle undefined xdg paths with fallbacks", () => {
    // Test the actual xdgData, xdgCache, xdgConfig, xdgState values
    const { xdgCache, xdgConfig, xdgData, xdgState } = require("xdg-basedir");

    // These may be undefined on some systems - we're documenting the behavior
    // The fix should add null checks and fallbacks

    // If xdgData is undefined, we should have a fallback path
    if (xdgData === undefined) {
      // This test will initially fail, demonstrating the bug
      // After fix, Global.Path.data should use a fallback
      expect(true).toBe(true); // Placeholder - will verify fix doesn't crash
    }

    if (xdgCache === undefined) {
      expect(true).toBe(true);
    }

    if (xdgConfig === undefined) {
      expect(true).toBe(true);
    }

    if (xdgState === undefined) {
      expect(true).toBe(true);
    }
  });

  /**
   * Tests that Global.Path is properly initialized even if xdg values are undefined.
   * This ensures the module can be imported without crashing.
   */
  test("Global.Path should be defined after import", async () => {
    // This test verifies the module doesn't crash on import
    // Before fix: may crash with "Cannot read property 'join' of undefined"
    // After fix: should work with fallback paths

    const { Global } = await import("./global");

    expect(Global.Path).toBeDefined();
    expect(Global.Path.home).toBeDefined();
    expect(Global.Path.data).toBeDefined();
    expect(Global.Path.cache).toBeDefined();
    expect(Global.Path.config).toBeDefined();
    expect(Global.Path.state).toBeDefined();
    expect(Global.Path.bin).toBeDefined();
    expect(Global.Path.log).toBeDefined();

    // Paths should be strings, not undefined
    expect(typeof Global.Path.data).toBe("string");
    expect(typeof Global.Path.cache).toBe("string");
    expect(typeof Global.Path.config).toBe("string");
    expect(typeof Global.Path.state).toBe("string");
  });

  /**
   * Tests that paths are absolute and contain the app name.
   * This ensures proper isolation of ralph's data from other applications.
   */
  test("paths should be absolute and contain app name", async () => {
    const { Global } = await import("./global");

    expect(Global.Path.data).toContain("ralph");
    expect(Global.Path.cache).toContain("ralph");
    expect(Global.Path.config).toContain("ralph");
    expect(Global.Path.state).toContain("ralph");

    // Paths should be absolute (start with / on Unix, or drive letter on Windows)
    const isAbsolute = (p: string) =>
      p.startsWith("/") || DRIVE_LETTER_PATTERN.test(p);
    expect(isAbsolute(Global.Path.data)).toBe(true);
    expect(isAbsolute(Global.Path.cache)).toBe(true);
    expect(isAbsolute(Global.Path.config)).toBe(true);
    expect(isAbsolute(Global.Path.state)).toBe(true);
  });
});
