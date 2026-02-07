import { describe, expect, test } from "bun:test";
import {
  ACTIVITY_ICONS,
  getActivityIndicator,
  getStatusColor,
  getStatusIcon,
  LOOP_STATE_COLORS,
} from "./session-utils";

describe("getStatusIcon", () => {
  test("running returns ↻", () => {
    expect(getStatusIcon("running")).toBe("↻");
  });
  test("complete returns ↻", () => {
    expect(getStatusIcon("complete")).toBe("↻");
  });
  test("error returns ✗", () => {
    expect(getStatusIcon("error")).toBe("✗");
  });
  test("paused returns ⏸", () => {
    expect(getStatusIcon("paused")).toBe("⏸");
  });
  test("stopped returns ⏹", () => {
    expect(getStatusIcon("stopped")).toBe("⏹");
  });
  test("unknown returns ?", () => {
    expect(getStatusIcon("unknown" as any)).toBe("?");
  });
});

describe("getStatusColor", () => {
  test("running is cyan", () => {
    expect(getStatusColor("running")).toBe("#00aaff");
  });
  test("complete is dark", () => {
    expect(getStatusColor("complete")).toBe("#333333");
  });
  test("error is red", () => {
    expect(getStatusColor("error")).toBe("#ff0000");
  });
  test("paused is yellow", () => {
    expect(getStatusColor("paused")).toBe("#ffff00");
  });
  test("stopped is orange", () => {
    expect(getStatusColor("stopped")).toBe("#ffaa00");
  });
  test("unknown is gray", () => {
    expect(getStatusColor("unknown" as any)).toBe("#808080");
  });
});

describe("getActivityIndicator", () => {
  test("thinking returns icon and color", () => {
    const result = getActivityIndicator("thinking");
    expect(result).toEqual({ icon: "◇", color: "#9d7cd8" });
  });
  test("responding returns icon and color", () => {
    const result = getActivityIndicator("responding");
    expect(result).toEqual({ icon: "◉", color: "#00aaff" });
  });
  test("tool_executing returns icon and color", () => {
    const result = getActivityIndicator("tool_executing");
    expect(result).toEqual({ icon: "⚡", color: "#f5a742" });
  });
  test("waiting returns icon and color", () => {
    const result = getActivityIndicator("waiting");
    expect(result).toEqual({ icon: "◌", color: "#808080" });
  });
  test("idle returns null", () => {
    expect(getActivityIndicator("idle")).toBeNull();
  });
  test("undefined returns null", () => {
    expect(getActivityIndicator(undefined)).toBeNull();
  });
  test("unknown activity returns null", () => {
    expect(getActivityIndicator("unknown")).toBeNull();
  });
});

describe("ACTIVITY_ICONS", () => {
  test("has all expected keys", () => {
    expect(Object.keys(ACTIVITY_ICONS)).toEqual([
      "thinking",
      "responding",
      "tool_executing",
      "waiting",
    ]);
  });
});

describe("LOOP_STATE_COLORS", () => {
  test("has all expected keys", () => {
    expect(Object.keys(LOOP_STATE_COLORS)).toEqual([
      "initializing",
      "prompting",
      "streaming",
      "thinking",
      "tool_executing",
      "completing",
    ]);
  });
  test("initializing is orange", () => {
    expect(LOOP_STATE_COLORS.initializing).toBe("#f5a742");
  });
  test("streaming is cyan", () => {
    expect(LOOP_STATE_COLORS.streaming).toBe("#00aaff");
  });
});
