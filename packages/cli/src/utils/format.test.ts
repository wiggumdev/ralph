import { describe, expect, test } from "bun:test";
import { formatCost, formatTokens } from "./format";

describe("formatTokens", () => {
  test("formats small numbers as-is", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(1)).toBe("1");
    expect(formatTokens(999)).toBe("999");
  });

  test("formats thousands with k suffix", () => {
    expect(formatTokens(1000)).toBe("1.0k");
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(12_345)).toBe("12.3k");
    expect(formatTokens(999_999)).toBe("1000.0k");
  });
});

describe("formatCost", () => {
  test("formats very small costs with 4 decimals", () => {
    expect(formatCost(0)).toBe("$0.0000");
    expect(formatCost(0.001)).toBe("$0.0010");
    expect(formatCost(0.0099)).toBe("$0.0099");
  });

  test("formats larger costs with 2 decimals", () => {
    expect(formatCost(0.01)).toBe("$0.01");
    expect(formatCost(0.1)).toBe("$0.10");
    expect(formatCost(1.23)).toBe("$1.23");
    expect(formatCost(100.456)).toBe("$100.46");
  });
});
