/**
 * Tab Bar Tests
 *
 * Tests for TabView type and tab-related logic.
 */

import { describe, expect, test } from "bun:test";
import type { TabView } from "#ui/components/tab-bar";

describe("TabView type", () => {
  test("loop is valid TabView", () => {
    const tab: TabView = "loop";
    expect(tab).toBe("loop");
  });

  test("learning is valid TabView", () => {
    const tab: TabView = "learning";
    expect(tab).toBe("learning");
  });

  test("backlog is valid TabView", () => {
    const tab: TabView = "backlog";
    expect(tab).toBe("backlog");
  });
});

describe("tab indicator logic", () => {
  function getTabIndicator(tab: TabView, currentTab: TabView): string {
    return currentTab === tab ? "▶ " : "  ";
  }

  test("active tab shows arrow", () => {
    expect(getTabIndicator("loop", "loop")).toBe("▶ ");
    expect(getTabIndicator("learning", "learning")).toBe("▶ ");
    expect(getTabIndicator("backlog", "backlog")).toBe("▶ ");
  });

  test("inactive tab shows spaces", () => {
    expect(getTabIndicator("loop", "learning")).toBe("  ");
    expect(getTabIndicator("learning", "backlog")).toBe("  ");
    expect(getTabIndicator("backlog", "loop")).toBe("  ");
  });
});

describe("tab color logic", () => {
  function getTabColor(tab: TabView, currentTab: TabView): string {
    return currentTab === tab ? "#00ff00" : "#666666";
  }

  test("active tab is green", () => {
    expect(getTabColor("loop", "loop")).toBe("#00ff00");
  });

  test("inactive tab is gray", () => {
    expect(getTabColor("loop", "learning")).toBe("#666666");
  });
});
