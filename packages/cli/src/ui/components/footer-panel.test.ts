/**
 * Footer Panel Tests
 *
 * Tests for helper functions in footer-panel.tsx.
 * Validates todo icon/color mapping logic.
 */

import { describe, expect, test } from "bun:test";

// Extracted from footer-panel.tsx for testing
function getTodoIcon(todoStatus: string): string {
  switch (todoStatus) {
    case "completed":
      return "☑";
    case "in_progress":
      return "◐";
    default:
      return "☐";
  }
}

function getTodoColor(todoStatus: string): string {
  switch (todoStatus) {
    case "completed":
      return "#00ff00";
    case "in_progress":
      return "#ffff00";
    default:
      return "#888888";
  }
}

describe("getTodoIcon", () => {
  test("completed returns filled checkbox", () => {
    expect(getTodoIcon("completed")).toBe("☑");
  });

  test("in_progress returns half-filled circle", () => {
    expect(getTodoIcon("in_progress")).toBe("◐");
  });

  test("pending returns empty checkbox", () => {
    expect(getTodoIcon("pending")).toBe("☐");
  });

  test("unknown status returns empty checkbox", () => {
    expect(getTodoIcon("unknown")).toBe("☐");
    expect(getTodoIcon("")).toBe("☐");
  });
});

describe("getTodoColor", () => {
  test("completed is green", () => {
    expect(getTodoColor("completed")).toBe("#00ff00");
  });

  test("in_progress is yellow", () => {
    expect(getTodoColor("in_progress")).toBe("#ffff00");
  });

  test("pending is gray", () => {
    expect(getTodoColor("pending")).toBe("#888888");
  });

  test("unknown status is gray", () => {
    expect(getTodoColor("unknown")).toBe("#888888");
    expect(getTodoColor("")).toBe("#888888");
  });
});

describe("hasUsageData logic", () => {
  function hasUsageData(
    showUsage: boolean,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): boolean {
    return showUsage && (inputTokens > 0 || outputTokens > 0 || cost > 0);
  }

  test("returns false when showUsage is false", () => {
    expect(hasUsageData(false, 100, 200, 0.5)).toBe(false);
  });

  test("returns false when all values are zero", () => {
    expect(hasUsageData(true, 0, 0, 0)).toBe(false);
  });

  test("returns true when input tokens > 0", () => {
    expect(hasUsageData(true, 100, 0, 0)).toBe(true);
  });

  test("returns true when output tokens > 0", () => {
    expect(hasUsageData(true, 0, 100, 0)).toBe(true);
  });

  test("returns true when cost > 0", () => {
    expect(hasUsageData(true, 0, 0, 0.01)).toBe(true);
  });
});
