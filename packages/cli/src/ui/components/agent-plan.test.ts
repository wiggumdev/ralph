import { describe, expect, test } from "bun:test";

type PlanEntryPriority = "high" | "medium" | "low";

// Extracted from agent-plan.tsx for testing
function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓";
    case "in_progress":
      return "◐";
    default:
      return "○";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#00ff00";
    case "in_progress":
      return "#00aaff";
    default:
      return "#666666";
  }
}

function getPriorityIndicator(priority: PlanEntryPriority): string {
  switch (priority) {
    case "high":
      return "!";
    case "medium":
      return "·";
    default:
      return " ";
  }
}

function getPriorityColor(priority: PlanEntryPriority): string {
  switch (priority) {
    case "high":
      return "#ff6666";
    case "medium":
      return "#ffaa00";
    default:
      return "#666666";
  }
}

describe("getStatusIcon", () => {
  test("completed returns ✓", () => {
    expect(getStatusIcon("completed")).toBe("✓");
  });
  test("in_progress returns ◐", () => {
    expect(getStatusIcon("in_progress")).toBe("◐");
  });
  test("pending returns ○", () => {
    expect(getStatusIcon("pending")).toBe("○");
  });
  test("unknown returns ○", () => {
    expect(getStatusIcon("unknown")).toBe("○");
  });
});

describe("getStatusColor", () => {
  test("completed is green", () => {
    expect(getStatusColor("completed")).toBe("#00ff00");
  });
  test("in_progress is cyan", () => {
    expect(getStatusColor("in_progress")).toBe("#00aaff");
  });
  test("pending is gray", () => {
    expect(getStatusColor("pending")).toBe("#666666");
  });
  test("unknown is gray", () => {
    expect(getStatusColor("unknown")).toBe("#666666");
  });
});

describe("getPriorityIndicator", () => {
  test("high returns !", () => {
    expect(getPriorityIndicator("high")).toBe("!");
  });
  test("medium returns ·", () => {
    expect(getPriorityIndicator("medium")).toBe("·");
  });
  test("low returns space", () => {
    expect(getPriorityIndicator("low")).toBe(" ");
  });
});

describe("getPriorityColor", () => {
  test("high is red", () => {
    expect(getPriorityColor("high")).toBe("#ff6666");
  });
  test("medium is orange", () => {
    expect(getPriorityColor("medium")).toBe("#ffaa00");
  });
  test("low is gray", () => {
    expect(getPriorityColor("low")).toBe("#666666");
  });
});
