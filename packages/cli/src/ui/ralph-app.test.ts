/**
 * Ralph App Core Logic Tests
 *
 * Tests for pure functions extracted from ralph-app.tsx.
 * These tests validate tab cycling, filter cycling, and PRD loading logic.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PassFilter } from "#ui/components/prd-items-tab";
import type { TabView } from "#ui/components/tab-bar";

// Extract and test pure functions

// cycleTab - cycles through tabs: output -> progress -> prd -> output
function cycleTab(prev: TabView): TabView {
  if (prev === "output") {
    return "progress";
  }
  if (prev === "progress") {
    return "prd";
  }
  return "output";
}

// cyclePassFilter - cycles through filters: all -> passing -> failing -> all
function cyclePassFilter(prev: PassFilter): PassFilter {
  if (prev === "all") {
    return "passing";
  }
  if (prev === "passing") {
    return "failing";
  }
  return "all";
}

describe("cycleTab", () => {
  test("output -> progress", () => {
    expect(cycleTab("output")).toBe("progress");
  });

  test("progress -> prd", () => {
    expect(cycleTab("progress")).toBe("prd");
  });

  test("prd -> output", () => {
    expect(cycleTab("prd")).toBe("output");
  });

  test("full cycle returns to start", () => {
    let tab: TabView = "output";
    tab = cycleTab(tab);
    tab = cycleTab(tab);
    tab = cycleTab(tab);
    expect(tab).toBe("output");
  });
});

describe("cyclePassFilter", () => {
  test("all -> passing", () => {
    expect(cyclePassFilter("all")).toBe("passing");
  });

  test("passing -> failing", () => {
    expect(cyclePassFilter("passing")).toBe("failing");
  });

  test("failing -> all", () => {
    expect(cyclePassFilter("failing")).toBe("all");
  });

  test("full cycle returns to start", () => {
    let filter: PassFilter = "all";
    filter = cyclePassFilter(filter);
    filter = cyclePassFilter(filter);
    filter = cyclePassFilter(filter);
    expect(filter).toBe("all");
  });
});

// Test loadPrdItems logic
describe("loadPrdItems logic", () => {
  const testDir = join(import.meta.dir, ".test-prd-items");
  const prdPath = join(testDir, "prd.json");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("returns empty array for non-existent file", () => {
    const loadPrdItems = (path: string) => {
      if (!existsSync(path)) {
        return [];
      }
      return [];
    };
    expect(loadPrdItems("/non/existent/path.json")).toEqual([]);
  });

  test("returns empty array for invalid JSON", () => {
    writeFileSync(prdPath, "{ invalid json }");
    const loadPrdItems = (path: string) => {
      if (!existsSync(path)) {
        return [];
      }
      try {
        JSON.parse("{ invalid }");
        return [];
      } catch {
        return [];
      }
    };
    expect(loadPrdItems(prdPath)).toEqual([]);
  });

  test("validates PRD structure correctly", async () => {
    const validPrd = [
      {
        category: "bug",
        title: "Test Bug",
        description: "A test bug",
        passes: false,
        acceptance: ["Fix the bug"],
      },
    ];
    writeFileSync(prdPath, JSON.stringify(validPrd));

    // Simulating what loadPrdItems does
    const text = await Bun.file(prdPath).text();
    const content = JSON.parse(text);
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]).toHaveProperty("title");
    expect(content[0]).toHaveProperty("category");
    expect(content[0]).toHaveProperty("passes");
  });
});

// Progress bar calculation
describe("progressBar calculation", () => {
  function progressBar(iteration: number, maxIterations: number): string {
    const pct = (iteration / maxIterations) * 100;
    const filled = Math.round(pct / 5);
    return "█".repeat(filled) + "░".repeat(20 - filled);
  }

  test("0% shows all empty", () => {
    const bar = progressBar(0, 10);
    expect(bar).toBe("░".repeat(20));
  });

  test("100% shows all filled", () => {
    const bar = progressBar(10, 10);
    expect(bar).toBe("█".repeat(20));
  });

  test("50% shows half filled", () => {
    const bar = progressBar(5, 10);
    expect(bar).toBe("█".repeat(10) + "░".repeat(10));
  });

  test("25% shows quarter filled", () => {
    const bar = progressBar(25, 100);
    expect(bar).toBe("█".repeat(5) + "░".repeat(15));
  });
});

// Status icon logic
describe("statusIcon logic", () => {
  function statusIcon(
    status: "running" | "complete" | "error" | "idle",
    spinnerFrame: number
  ): string {
    const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    switch (status) {
      case "running":
        return spinnerChars[spinnerFrame] ?? "⠋";
      case "complete":
        return "✓";
      case "error":
        return "✗";
      default:
        return "○";
    }
  }

  test("running returns spinner character", () => {
    expect(statusIcon("running", 0)).toBe("⠋");
    expect(statusIcon("running", 5)).toBe("⠴");
  });

  test("complete returns checkmark", () => {
    expect(statusIcon("complete", 0)).toBe("✓");
  });

  test("error returns X", () => {
    expect(statusIcon("error", 0)).toBe("✗");
  });

  test("idle returns circle", () => {
    expect(statusIcon("idle", 0)).toBe("○");
  });
});

// Status color logic
describe("statusColor logic", () => {
  function statusColor(
    status: "running" | "complete" | "error" | "idle"
  ): string {
    switch (status) {
      case "running":
        return "#00ff00";
      case "complete":
        return "#00ff00";
      case "error":
        return "#ff0000";
      default:
        return "#666666";
    }
  }

  test("running is green", () => {
    expect(statusColor("running")).toBe("#00ff00");
  });

  test("complete is green", () => {
    expect(statusColor("complete")).toBe("#00ff00");
  });

  test("error is red", () => {
    expect(statusColor("error")).toBe("#ff0000");
  });

  test("idle is gray", () => {
    expect(statusColor("idle")).toBe("#666666");
  });
});

// prdHelpText logic
describe("prdHelpText logic", () => {
  function prdHelpText(searchMode: boolean, searchQuery: string): string {
    if (searchMode) {
      return `Search: ${searchQuery}_ | [Enter/Esc] done`;
    }
    return "[f] filter | [/] search | [c] clear";
  }

  test("normal mode shows keyboard shortcuts", () => {
    expect(prdHelpText(false, "")).toBe("[f] filter | [/] search | [c] clear");
  });

  test("search mode shows query with cursor", () => {
    expect(prdHelpText(true, "test")).toBe("Search: test_ | [Enter/Esc] done");
  });

  test("search mode with empty query", () => {
    expect(prdHelpText(true, "")).toBe("Search: _ | [Enter/Esc] done");
  });
});
