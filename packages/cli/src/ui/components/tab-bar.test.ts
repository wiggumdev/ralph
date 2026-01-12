/**
 * Tab Bar Tests
 *
 * Tests for TabView type and tab-related logic.
 */

import { describe, expect, test } from "bun:test";
import type { TabView } from "#ui/components/tab-bar";

describe("TabView type", () => {
  test("output is valid TabView", () => {
    const tab: TabView = "output";
    expect(tab).toBe("output");
  });

  test("progress is valid TabView", () => {
    const tab: TabView = "progress";
    expect(tab).toBe("progress");
  });

  test("prd is valid TabView", () => {
    const tab: TabView = "prd";
    expect(tab).toBe("prd");
  });
});

describe("tab indicator logic", () => {
  function getTabIndicator(tab: TabView, currentTab: TabView): string {
    return currentTab === tab ? "▶ " : "  ";
  }

  test("active tab shows arrow", () => {
    expect(getTabIndicator("output", "output")).toBe("▶ ");
    expect(getTabIndicator("progress", "progress")).toBe("▶ ");
    expect(getTabIndicator("prd", "prd")).toBe("▶ ");
  });

  test("inactive tab shows spaces", () => {
    expect(getTabIndicator("output", "progress")).toBe("  ");
    expect(getTabIndicator("progress", "prd")).toBe("  ");
    expect(getTabIndicator("prd", "output")).toBe("  ");
  });
});

describe("tab color logic", () => {
  function getTabColor(tab: TabView, currentTab: TabView): string {
    return currentTab === tab ? "#00ff00" : "#666666";
  }

  test("active tab is green", () => {
    expect(getTabColor("output", "output")).toBe("#00ff00");
  });

  test("inactive tab is gray", () => {
    expect(getTabColor("output", "progress")).toBe("#666666");
  });
});
