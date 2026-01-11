/**
 * Validation Utilities Tests
 *
 * Tests runtime type validation utilities that replace unsafe 'as' casts.
 * These utilities provide safe type checking with proper error handling.
 *
 * Testing this module prevents type-related runtime errors that could
 * occur from invalid external data (config files, CLI args, API responses).
 */

import { describe, expect, test } from "bun:test";
import {
  isOptionalString,
  isOptionalStringArray,
  isOutputFormat,
  isPlainObject,
  isTodoItem,
  isTodoItemArray,
  parseOpenCodeEvent,
  parsePrd,
  parseStreamJsonMessage,
  validateTomlOutput,
} from "./validation";

describe("isOutputFormat", () => {
  /**
   * Tests that valid output formats are recognized.
   * These are the three supported parser formats.
   */
  test("accepts valid output formats", () => {
    expect(isOutputFormat("stream-json")).toBe(true);
    expect(isOutputFormat("opencode-json")).toBe(true);
    expect(isOutputFormat("text")).toBe(true);
  });

  /**
   * Tests that invalid strings are rejected.
   * Prevents using unsupported parser formats.
   */
  test("rejects invalid format strings", () => {
    expect(isOutputFormat("json")).toBe(false);
    expect(isOutputFormat("xml")).toBe(false);
    expect(isOutputFormat("")).toBe(false);
    expect(isOutputFormat("stream-json-v2")).toBe(false);
  });

  /**
   * Tests that non-string values are rejected.
   * OutputFormat must be a string.
   */
  test("rejects non-string values", () => {
    expect(isOutputFormat(123)).toBe(false);
    expect(isOutputFormat(null)).toBe(false);
    expect(isOutputFormat(undefined)).toBe(false);
    expect(isOutputFormat({})).toBe(false);
    expect(isOutputFormat([])).toBe(false);
  });
});

describe("parsePrd", () => {
  /**
   * Tests that valid PRD JSON is parsed correctly.
   * This is the happy path for PRD file loading.
   */
  test("parses valid PRD JSON", () => {
    const json = JSON.stringify([
      {
        category: "feature",
        title: "Test Feature",
        description: "A test feature",
        passes: false,
        acceptance: ["Criteria 1"],
      },
    ]);

    const result = parsePrd(json);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Test Feature");
  });

  /**
   * Tests that multiple features are parsed correctly.
   * PRD files typically contain multiple features.
   */
  test("parses PRD with multiple features", () => {
    const json = JSON.stringify([
      {
        category: "bug",
        title: "Bug Fix",
        description: "Fix a bug",
        passes: true,
        acceptance: ["Bug fixed"],
      },
      {
        category: "feature",
        title: "New Feature",
        description: "Add feature",
        passes: false,
        acceptance: ["Feature works"],
      },
    ]);

    const result = parsePrd(json);
    expect(result).toHaveLength(2);
    expect(result[0]?.category).toBe("bug");
    expect(result[1]?.category).toBe("feature");
  });

  /**
   * Tests that invalid JSON throws meaningful error.
   * Syntax errors should be caught and reported.
   */
  test("throws error on invalid JSON", () => {
    expect(() => parsePrd("not valid json")).toThrow(
      "Invalid JSON in PRD file"
    );
  });

  /**
   * Tests that JSON with wrong structure throws validation error.
   * PRD must match the PrdSchema structure.
   */
  test("throws error on invalid PRD structure", () => {
    const json = JSON.stringify([
      {
        // Missing required fields
        title: "Incomplete",
      },
    ]);

    expect(() => parsePrd(json)).toThrow("Invalid PRD format");
  });

  /**
   * Tests that empty array is rejected.
   * PRD must have at least one feature.
   */
  test("throws error on empty PRD array", () => {
    expect(() => parsePrd("[]")).toThrow("Invalid PRD format");
  });

  /**
   * Tests that non-array JSON is rejected.
   * PRD must be an array of features.
   */
  test("throws error on non-array PRD", () => {
    const json = JSON.stringify({ feature: "value" });
    expect(() => parsePrd(json)).toThrow("Invalid PRD format");
  });

  /**
   * Tests that features with invalid fields are rejected.
   * All feature fields must meet schema requirements.
   */
  test("throws error on feature with empty strings", () => {
    const json = JSON.stringify([
      {
        category: "",
        title: "Test",
        description: "Desc",
        passes: false,
        acceptance: ["Criteria"],
      },
    ]);

    expect(() => parsePrd(json)).toThrow("Invalid PRD format");
  });
});

describe("parseStreamJsonMessage", () => {
  /**
   * Tests that valid stream JSON message is parsed.
   * Basic message structure with required type field.
   */
  test("parses valid stream JSON message", () => {
    const json = JSON.stringify({
      type: "message",
      content: "Hello",
    });

    const result = parseStreamJsonMessage(json);
    expect(result.type).toBe("message");
    expect(result.content).toBe("Hello");
  });

  /**
   * Tests that messages with all optional fields are parsed.
   * Stream messages can have various optional fields.
   */
  test("parses message with all optional fields", () => {
    const json = JSON.stringify({
      type: "result",
      subtype: "success",
      session_id: "abc123",
      result: "completed",
      content: "Done",
      message: { key: "value" },
    });

    const result = parseStreamJsonMessage(json);
    expect(result.type).toBe("result");
    expect(result.subtype).toBe("success");
    expect(result.session_id).toBe("abc123");
    expect(result.result).toBe("completed");
  });

  /**
   * Tests that additional unknown properties are preserved.
   * Stream messages may have adapter-specific fields.
   */
  test("allows additional properties", () => {
    const json = JSON.stringify({
      type: "custom",
      customField: "value",
      anotherField: 123,
    });

    const result = parseStreamJsonMessage(json);
    expect(result.type).toBe("custom");
    expect((result as Record<string, unknown>).customField).toBe("value");
    expect((result as Record<string, unknown>).anotherField).toBe(123);
  });

  /**
   * Tests that invalid JSON throws meaningful error.
   */
  test("throws error on invalid JSON", () => {
    expect(() => parseStreamJsonMessage("{invalid}")).toThrow(
      "Invalid JSON in stream message"
    );
  });

  /**
   * Tests that message without type field is rejected.
   * Type is the only required field.
   */
  test("throws error on missing type field", () => {
    const json = JSON.stringify({
      content: "No type field",
    });

    expect(() => parseStreamJsonMessage(json)).toThrow(
      "Invalid stream JSON message"
    );
  });

  /**
   * Tests that message with non-string type is rejected.
   */
  test("throws error on non-string type", () => {
    const json = JSON.stringify({
      type: 123,
    });

    expect(() => parseStreamJsonMessage(json)).toThrow(
      "Invalid stream JSON message"
    );
  });
});

describe("parseOpenCodeEvent", () => {
  /**
   * Tests that valid OpenCode event is parsed.
   * Basic event structure with required event field.
   */
  test("parses valid OpenCode event", () => {
    const json = JSON.stringify({
      event: "message",
      data: { content: "Hello" },
    });

    const result = parseOpenCodeEvent(json);
    expect(result.event).toBe("message");
    expect(result.data).toEqual({ content: "Hello" });
  });

  /**
   * Tests that event without data field is valid.
   * Data is optional in OpenCode events.
   */
  test("parses event without data field", () => {
    const json = JSON.stringify({
      event: "start",
    });

    const result = parseOpenCodeEvent(json);
    expect(result.event).toBe("start");
    expect(result.data).toBeUndefined();
  });

  /**
   * Tests that additional properties are preserved.
   */
  test("allows additional properties", () => {
    const json = JSON.stringify({
      event: "custom",
      data: "value",
      extra: "field",
    });

    const result = parseOpenCodeEvent(json);
    expect(result.event).toBe("custom");
    expect((result as Record<string, unknown>).extra).toBe("field");
  });

  /**
   * Tests that invalid JSON throws error.
   */
  test("throws error on invalid JSON", () => {
    expect(() => parseOpenCodeEvent("not json")).toThrow(
      "Invalid JSON in OpenCode event"
    );
  });

  /**
   * Tests that event without event field is rejected.
   */
  test("throws error on missing event field", () => {
    const json = JSON.stringify({
      data: "No event field",
    });

    expect(() => parseOpenCodeEvent(json)).toThrow("Invalid OpenCode event");
  });

  /**
   * Tests that event with non-string event field is rejected.
   */
  test("throws error on non-string event", () => {
    const json = JSON.stringify({
      event: 123,
    });

    expect(() => parseOpenCodeEvent(json)).toThrow("Invalid OpenCode event");
  });
});

describe("isPlainObject", () => {
  /**
   * Tests that plain objects are recognized.
   * Used to detect objects that should be deep-merged.
   */
  test("recognizes plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ key: "value" })).toBe(true);
    expect(isPlainObject({ nested: { key: "value" } })).toBe(true);
  });

  /**
   * Tests that arrays are not considered plain objects.
   * Arrays should be replaced, not merged.
   */
  test("rejects arrays", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  /**
   * Tests that null is not a plain object.
   */
  test("rejects null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  /**
   * Tests that primitives are not plain objects.
   */
  test("rejects primitives", () => {
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });

  /**
   * Tests that special objects are not plain objects.
   * Date, RegExp, etc. should not be deep-merged.
   */
  test("rejects special objects", () => {
    const dateObj = new Date();
    const mapObj = new Map();
    const setObj = new Set();

    expect(isPlainObject(dateObj)).toBe(false);
    expect(isPlainObject(mapObj)).toBe(false);
    expect(isPlainObject(setObj)).toBe(false);
  });
});

describe("validateTomlOutput", () => {
  /**
   * Tests that valid TOML output (plain object) is accepted.
   */
  test("accepts plain objects from TOML parser", () => {
    const validToml = { adapter: "claude", verbose: true };
    const result = validateTomlOutput(validToml);
    expect(result).toEqual(validToml);
  });

  /**
   * Tests that empty objects are valid.
   */
  test("accepts empty objects", () => {
    const result = validateTomlOutput({});
    expect(result).toEqual({});
  });

  /**
   * Tests that nested objects are valid.
   */
  test("accepts nested objects", () => {
    const nested = { hooks: { ralph_start: "cmd" } };
    const result = validateTomlOutput(nested);
    expect(result).toEqual(nested);
  });

  /**
   * Tests that null throws error.
   */
  test("throws error on null", () => {
    expect(() => validateTomlOutput(null)).toThrow(
      "TOML parsing produced invalid output"
    );
  });

  /**
   * Tests that undefined throws error.
   */
  test("throws error on undefined", () => {
    expect(() => validateTomlOutput(undefined)).toThrow(
      "TOML parsing produced invalid output"
    );
  });

  /**
   * Tests that arrays throw error.
   */
  test("throws error on arrays", () => {
    expect(() => validateTomlOutput([])).toThrow(
      "TOML parsing produced invalid output"
    );
  });

  /**
   * Tests that primitives throw error.
   */
  test("throws error on primitives", () => {
    expect(() => validateTomlOutput("string")).toThrow(
      "TOML parsing produced invalid output"
    );
    expect(() => validateTomlOutput(123)).toThrow(
      "TOML parsing produced invalid output"
    );
  });
});

describe("isTodoItem", () => {
  /**
   * Tests that valid TodoItems are recognized.
   */
  test("accepts valid TodoItems", () => {
    expect(isTodoItem({ content: "test", status: "pending" })).toBe(true);
    expect(isTodoItem({ content: "test", status: "in_progress" })).toBe(true);
    expect(isTodoItem({ content: "test", status: "completed" })).toBe(true);
  });

  /**
   * Tests that TodoItems with extra fields are accepted.
   */
  test("accepts TodoItems with extra fields", () => {
    expect(
      isTodoItem({
        content: "test",
        status: "pending",
        id: "123",
        priority: "high",
      })
    ).toBe(true);
  });

  /**
   * Tests that null/undefined are rejected.
   */
  test("rejects null and undefined", () => {
    expect(isTodoItem(null)).toBe(false);
    expect(isTodoItem(undefined)).toBe(false);
  });

  /**
   * Tests that objects missing required fields are rejected.
   */
  test("rejects objects missing required fields", () => {
    expect(isTodoItem({})).toBe(false);
    expect(isTodoItem({ content: "test" })).toBe(false);
    expect(isTodoItem({ status: "pending" })).toBe(false);
  });

  /**
   * Tests that invalid status values are rejected.
   */
  test("rejects invalid status values", () => {
    expect(isTodoItem({ content: "test", status: "invalid" })).toBe(false);
    expect(isTodoItem({ content: "test", status: "" })).toBe(false);
    expect(isTodoItem({ content: "test", status: 123 })).toBe(false);
  });

  /**
   * Tests that invalid content values are rejected.
   */
  test("rejects invalid content values", () => {
    expect(isTodoItem({ content: "", status: "pending" })).toBe(false);
    expect(isTodoItem({ content: 123, status: "pending" })).toBe(false);
    expect(isTodoItem({ content: null, status: "pending" })).toBe(false);
  });

  /**
   * Tests that non-objects are rejected.
   */
  test("rejects non-objects", () => {
    expect(isTodoItem("string")).toBe(false);
    expect(isTodoItem(123)).toBe(false);
    expect(isTodoItem([])).toBe(false);
  });
});

describe("isTodoItemArray", () => {
  /**
   * Tests that valid TodoItem arrays are recognized.
   */
  test("accepts valid TodoItem arrays", () => {
    expect(isTodoItemArray([])).toBe(true);
    expect(isTodoItemArray([{ content: "test", status: "pending" }])).toBe(
      true
    );
    expect(
      isTodoItemArray([
        { content: "test1", status: "pending" },
        { content: "test2", status: "completed" },
      ])
    ).toBe(true);
  });

  /**
   * Tests that arrays with extra fields are accepted.
   */
  test("accepts arrays with TodoItems having extra fields", () => {
    expect(
      isTodoItemArray([
        { content: "test", status: "pending", id: "123" },
        { content: "test2", status: "completed", priority: "high" },
      ])
    ).toBe(true);
  });

  /**
   * Tests that non-arrays are rejected.
   */
  test("rejects non-arrays", () => {
    expect(isTodoItemArray(null)).toBe(false);
    expect(isTodoItemArray(undefined)).toBe(false);
    expect(isTodoItemArray("string")).toBe(false);
    expect(isTodoItemArray({})).toBe(false);
  });

  /**
   * Tests that arrays with invalid items are rejected.
   */
  test("rejects arrays containing invalid items", () => {
    expect(isTodoItemArray([{}])).toBe(false);
    expect(isTodoItemArray([{ content: "test", status: "invalid" }])).toBe(
      false
    );
    expect(
      isTodoItemArray([
        { content: "test", status: "pending" },
        { invalid: "item" },
      ])
    ).toBe(false);
  });

  /**
   * Tests that arrays with mixed valid/invalid items are rejected.
   */
  test("rejects arrays with partial valid items", () => {
    expect(
      isTodoItemArray([
        { content: "valid", status: "pending" },
        { content: "", status: "pending" }, // Empty content
      ])
    ).toBe(false);
  });

  /**
   * Tests that arrays containing non-objects are rejected.
   */
  test("rejects arrays containing non-objects", () => {
    expect(isTodoItemArray(["string"])).toBe(false);
    expect(isTodoItemArray([123])).toBe(false);
    expect(isTodoItemArray([null])).toBe(false);
  });
});

describe("isOptionalString", () => {
  /**
   * Tests that strings are accepted.
   */
  test("accepts strings", () => {
    expect(isOptionalString("test")).toBe(true);
    expect(isOptionalString("")).toBe(true);
    expect(isOptionalString("multi word string")).toBe(true);
  });

  /**
   * Tests that undefined is accepted.
   */
  test("accepts undefined", () => {
    expect(isOptionalString(undefined)).toBe(true);
  });

  /**
   * Tests that non-string values are rejected.
   */
  test("rejects non-string values", () => {
    expect(isOptionalString(null)).toBe(false);
    expect(isOptionalString(123)).toBe(false);
    expect(isOptionalString([])).toBe(false);
    expect(isOptionalString({})).toBe(false);
    expect(isOptionalString(true)).toBe(false);
  });
});

describe("isOptionalStringArray", () => {
  /**
   * Tests that string arrays are accepted.
   */
  test("accepts string arrays", () => {
    expect(isOptionalStringArray([])).toBe(true);
    expect(isOptionalStringArray(["test"])).toBe(true);
    expect(isOptionalStringArray(["test1", "test2"])).toBe(true);
    expect(isOptionalStringArray([""])).toBe(true);
  });

  /**
   * Tests that undefined is accepted.
   */
  test("accepts undefined", () => {
    expect(isOptionalStringArray(undefined)).toBe(true);
  });

  /**
   * Tests that non-arrays are rejected.
   */
  test("rejects non-arrays", () => {
    expect(isOptionalStringArray(null)).toBe(false);
    expect(isOptionalStringArray("string")).toBe(false);
    expect(isOptionalStringArray(123)).toBe(false);
    expect(isOptionalStringArray({})).toBe(false);
  });

  /**
   * Tests that arrays with non-string values are rejected.
   */
  test("rejects arrays containing non-strings", () => {
    expect(isOptionalStringArray([123])).toBe(false);
    expect(isOptionalStringArray([null])).toBe(false);
    expect(isOptionalStringArray([{}])).toBe(false);
    expect(isOptionalStringArray(["test", 123])).toBe(false);
    expect(isOptionalStringArray(["test", null])).toBe(false);
  });
});
