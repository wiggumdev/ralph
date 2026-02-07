import { describe, expect, test } from "bun:test";

type PermissionOptionKind =
  | "allow_once"
  | "allow_always"
  | "reject_once"
  | "reject_always";

// Extracted from permission-modal.tsx for testing
function getOptionColor(kind: PermissionOptionKind | string): string {
  switch (kind) {
    case "allow_once":
    case "allow_always":
      return "#00ff00";
    case "reject_once":
    case "reject_always":
      return "#ff4444";
    default:
      return "#aaaaaa";
  }
}

function getKindLabel(kind: PermissionOptionKind | string): string {
  switch (kind) {
    case "allow_once":
      return "once";
    case "allow_always":
      return "always";
    case "reject_once":
      return "deny";
    case "reject_always":
      return "never";
    default:
      return "";
  }
}

describe("getOptionColor", () => {
  test("allow_once is green", () => {
    expect(getOptionColor("allow_once")).toBe("#00ff00");
  });
  test("allow_always is green", () => {
    expect(getOptionColor("allow_always")).toBe("#00ff00");
  });
  test("reject_once is red", () => {
    expect(getOptionColor("reject_once")).toBe("#ff4444");
  });
  test("reject_always is red", () => {
    expect(getOptionColor("reject_always")).toBe("#ff4444");
  });
  test("unknown is gray", () => {
    expect(getOptionColor("unknown")).toBe("#aaaaaa");
  });
});

describe("getKindLabel", () => {
  test("allow_once returns once", () => {
    expect(getKindLabel("allow_once")).toBe("once");
  });
  test("allow_always returns always", () => {
    expect(getKindLabel("allow_always")).toBe("always");
  });
  test("reject_once returns deny", () => {
    expect(getKindLabel("reject_once")).toBe("deny");
  });
  test("reject_always returns never", () => {
    expect(getKindLabel("reject_always")).toBe("never");
  });
  test("unknown returns empty string", () => {
    expect(getKindLabel("unknown")).toBe("");
  });
});
