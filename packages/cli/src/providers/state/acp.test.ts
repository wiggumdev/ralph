import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { AcpAdapter } from "#adapters/acp";
import { AcpStateProvider, type AcpStateProviderOptions } from "./acp";

// Create a minimal mock adapter - cast to AcpAdapter since we only need subset of methods
function createMockAdapter(): AcpAdapter {
  return {
    name: "test",
    command: "test",
    args: [],
    isAvailable: () => Promise.resolve(true),
    run: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
    getSessionId: () => undefined,
    getResumeCommand: () => null,
  } as unknown as AcpAdapter;
}

describe("AcpStateProvider permission tracking", () => {
  let provider: AcpStateProvider;
  let mockCallback: ReturnType<typeof mock>;

  beforeEach(() => {
    const adapter = createMockAdapter();
    const options: AcpStateProviderOptions = {
      prompt: "test prompt",
      maxIterations: 1,
    };
    provider = new AcpStateProvider(adapter, options);
    mockCallback = mock();
    provider.subscribe(mockCallback);
  });

  describe("getPermissionSummary returns cloned objects", () => {
    test("modifying returned objects does not affect internal state", () => {
      // Add a permission
      provider.trackPermission("Bash(ls)", "allowed");

      // Get summary
      const summary1 = provider.getPermissionSummary();
      expect(summary1).toHaveLength(1);
      expect(summary1[0]!.count).toBe(1);

      // Mutate the returned object
      summary1[0]!.count = 999;

      // Get summary again - should be unchanged
      const summary2 = provider.getPermissionSummary();
      expect(summary2[0]!.count).toBe(1);
    });

    test("multiple calls return independent clones", () => {
      provider.trackPermission("Bash(ls)", "allowed");

      const summary1 = provider.getPermissionSummary();
      const summary2 = provider.getPermissionSummary();

      expect(summary1[0]).not.toBe(summary2[0]);
      expect(summary1[0]).toEqual(summary2[0]);
    });
  });

  describe("addTrackedPermission", () => {
    test("increments count for same permission", () => {
      provider.trackPermission("Bash(ls)", "allowed");
      provider.trackPermission("Bash(ls)", "allowed");
      provider.trackPermission("Bash(ls)", "allowed");

      const summary = provider.getPermissionSummary();
      expect(summary).toHaveLength(1);
      expect(summary[0]!.count).toBe(3);
    });

    test("tracks same name with different status separately", () => {
      provider.trackPermission("Bash(ls)", "allowed");
      provider.trackPermission("Bash(ls)", "denied");

      const summary = provider.getPermissionSummary();
      expect(summary).toHaveLength(2);

      const allowed = summary.find((s) => s.status === "allowed");
      const denied = summary.find((s) => s.status === "denied");

      expect(allowed?.count).toBe(1);
      expect(denied?.count).toBe(1);
    });

    test("tracks multiple different permissions", () => {
      provider.trackPermission("Bash(ls)", "allowed");
      provider.trackPermission("Read", "allowed");
      provider.trackPermission("WebFetch(domain:x.com)", "denied");

      const summary = provider.getPermissionSummary();
      expect(summary).toHaveLength(3);
    });
  });

  describe("callback emission", () => {
    test("emits permissionSummary on each trackPermission call", () => {
      provider.trackPermission("Bash(ls)", "allowed");

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        permissionSummary: expect.any(Array),
      });
    });

    test("emits updated summary with correct count", () => {
      provider.trackPermission("Bash(ls)", "allowed");
      provider.trackPermission("Bash(ls)", "allowed");

      expect(mockCallback).toHaveBeenCalledTimes(2);

      const lastCall = mockCallback.mock.calls[1]![0] as {
        permissionSummary: Array<{ count: number }>;
      };
      expect(lastCall.permissionSummary[0]!.count).toBe(2);
    });
  });

  describe("initial state", () => {
    test("getPermissionSummary returns empty array initially", () => {
      const summary = provider.getPermissionSummary();
      expect(summary).toEqual([]);
    });

    test("getInitialState has no permissionRequest", () => {
      const state = provider.getInitialState();
      expect(state.permissionRequest).toBeNull();
    });
  });
});
