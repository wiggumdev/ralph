import { describe, expect, test } from "bun:test";

// Extracted from progress.tsx for testing
function progressBar(iteration: number, max: number | undefined): string {
  if (max === undefined) {
    return "";
  }
  const width = 20;
  const filled = Math.round((iteration / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

describe("progressBar", () => {
  test("returns empty string when max is undefined", () => {
    expect(progressBar(5, undefined)).toBe("");
  });

  test("returns all empty when iteration is 0", () => {
    expect(progressBar(0, 10)).toBe("░".repeat(20));
  });

  test("returns all filled when iteration equals max", () => {
    expect(progressBar(10, 10)).toBe("█".repeat(20));
  });

  test("returns half filled at midpoint", () => {
    const result = progressBar(5, 10);
    expect(result).toBe("█".repeat(10) + "░".repeat(10));
  });

  test("handles 1/4 progress", () => {
    const result = progressBar(1, 4);
    expect(result).toBe("█".repeat(5) + "░".repeat(15));
  });

  test("handles 3/4 progress", () => {
    const result = progressBar(3, 4);
    expect(result).toBe("█".repeat(15) + "░".repeat(5));
  });
});
