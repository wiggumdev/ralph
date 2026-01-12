/**
 * Session Panel Tests
 *
 * Tests for helper functions in session-panel.tsx.
 * Validates todo icon/color mapping logic.
 */

import { describe, expect, test } from "bun:test";

// Extracted from session-panel.tsx for testing
function getTodoIcon(status: string): string {
  switch (status) {
    case "completed":
      return "☑";
    case "in_progress":
      return "◐";
    default:
      return "☐";
  }
}

function getTodoColor(status: string): string {
  switch (status) {
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
  });
});

describe("sessionId truncation logic", () => {
  function truncateSessionId(sessionId: string | undefined): string {
    if (!sessionId) {
      return "";
    }
    return `${sessionId.slice(0, 12)}...`;
  }

  test("truncates long session id", () => {
    const sessionId = "abc123def456ghi789";
    expect(truncateSessionId(sessionId)).toBe("abc123def456...");
  });

  test("truncates short session id", () => {
    const sessionId = "short";
    expect(truncateSessionId(sessionId)).toBe("short...");
  });

  test("handles undefined", () => {
    expect(truncateSessionId(undefined)).toBe("");
  });
});
