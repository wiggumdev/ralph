import { describe, expect, test } from "bun:test";
import {
  COLLAPSED_PREVIEW_LENGTH,
  CYAN,
  getStatusColor,
  getStatusIndicator,
  truncatePreview,
} from "./agent-block-utils";

describe("getStatusIndicator", () => {
  test("pending returns ⠿", () => {
    expect(getStatusIndicator("pending")).toBe("⠿");
  });
  test("in_progress returns ⠿", () => {
    expect(getStatusIndicator("in_progress")).toBe("⠿");
  });
  test("completed returns ⠿", () => {
    expect(getStatusIndicator("completed")).toBe("⠿");
  });
  test("failed returns ⠿", () => {
    expect(getStatusIndicator("failed")).toBe("⠿");
  });
  test("unknown returns empty string", () => {
    expect(getStatusIndicator("unknown" as any)).toBe("");
  });
});

describe("getStatusColor", () => {
  test("pending is gray", () => {
    expect(getStatusColor("pending")).toBe("#666666");
  });
  test("in_progress is orange", () => {
    expect(getStatusColor("in_progress")).toBe("#f5a742");
  });
  test("completed is green", () => {
    expect(getStatusColor("completed")).toBe("#7fd88f");
  });
  test("failed is red", () => {
    expect(getStatusColor("failed")).toBe("#ff6666");
  });
  test("unknown defaults to gray", () => {
    expect(getStatusColor("unknown" as any)).toBe("#666666");
  });
});

describe("truncatePreview", () => {
  test("short text unchanged", () => {
    expect(truncatePreview("hello")).toBe("hello");
  });
  test("text at exactly max length unchanged", () => {
    const text = "a".repeat(COLLAPSED_PREVIEW_LENGTH);
    expect(truncatePreview(text)).toBe(text);
  });
  test("long text truncated with ellipsis", () => {
    const text = "a".repeat(COLLAPSED_PREVIEW_LENGTH + 10);
    expect(truncatePreview(text)).toBe(
      `${"a".repeat(COLLAPSED_PREVIEW_LENGTH)}...`
    );
  });
  test("custom maxLength", () => {
    expect(truncatePreview("hello world", 5)).toBe("hello...");
  });
  test("empty string unchanged", () => {
    expect(truncatePreview("")).toBe("");
  });
});

describe("constants", () => {
  test("CYAN is correct", () => {
    expect(CYAN).toBe("#56b6c2");
  });
  test("COLLAPSED_PREVIEW_LENGTH is 40", () => {
    expect(COLLAPSED_PREVIEW_LENGTH).toBe(40);
  });
});
