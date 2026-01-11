import { describe, expect, test } from "bun:test";
import type { OutputFormat } from "#parsers";
import { BaseAdapter } from "./base-adapter";
import type { AdapterOptions, CLIAdapter } from "./types";

// Concrete test adapter for testing BaseAdapter
class TestAdapter extends BaseAdapter {
  readonly name = "test";
  readonly supportedFormats: OutputFormat[] = ["text"];

  buildArgs(prompt: string, _options: AdapterOptions): string[] {
    return ["test", "-p", prompt];
  }
}

describe("BaseAdapter", () => {
  describe("completionMarker", () => {
    test("should have default completion marker", () => {
      const adapter = new TestAdapter();
      expect(adapter.completionMarker).toBe("<promise>COMPLETE</promise>");
    });
  });

  describe("detectCompletion", () => {
    test("should detect completion marker in output", () => {
      const adapter = new TestAdapter();
      const output = "Some text <promise>COMPLETE</promise> more text";
      expect(adapter.detectCompletion(output)).toBe(true);
    });

    test("should not detect completion when marker is absent", () => {
      const adapter = new TestAdapter();
      const output = "Some text without marker";
      expect(adapter.detectCompletion(output)).toBe(false);
    });

    test("should detect exact completion marker", () => {
      const adapter = new TestAdapter();
      const output = "<promise>COMPLETE</promise>";
      expect(adapter.detectCompletion(output)).toBe(true);
    });

    test("should not detect partial matches", () => {
      const adapter = new TestAdapter();
      const output = "<promise>INCOMPLETE</promise>";
      expect(adapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("isAvailable", () => {
    test("should check if command is available", async () => {
      const adapter = new TestAdapter();
      const isAvailable = await adapter.isAvailable();
      // Since 'test' command may not exist, we just verify it returns a boolean
      expect(typeof isAvailable).toBe("boolean");
    });

    test("should return true for existing commands", async () => {
      // Create adapter with name of a command that exists
      class ExistingCommandAdapter extends BaseAdapter {
        readonly name = "node"; // node should always exist in test env
        readonly supportedFormats: OutputFormat[] = ["text"];
        buildArgs(prompt: string): string[] {
          return [prompt];
        }
      }
      const adapter = new ExistingCommandAdapter();
      const isAvailable = await adapter.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe("interface compliance", () => {
    test("should implement CLIAdapter interface", () => {
      const adapter: CLIAdapter = new TestAdapter();
      expect(adapter.name).toBe("test");
      expect(adapter.completionMarker).toBe("<promise>COMPLETE</promise>");
      expect(adapter.supportedFormats).toEqual(["text"]);
      expect(typeof adapter.buildArgs).toBe("function");
      expect(typeof adapter.detectCompletion).toBe("function");
      expect(typeof adapter.isAvailable).toBe("function");
    });
  });
});
