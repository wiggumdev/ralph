import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { PermissionModal } from "./permission-modal";

describe("PermissionModal rendering", () => {
  test("renders permission request", async () => {
    const request = {
      toolCall: {
        toolCallId: "tc-1",
        title: "Bash",
        _meta: { claudeCode: { toolName: "Bash" } },
        rawInput: { command: "ls -la" },
        kind: "execute",
      },
      resolvedToolName: "Bash",
      options: [
        { id: "allow", name: "Allow", kind: "allow_once" as const },
        { id: "deny", name: "Deny", kind: "reject_once" as const },
      ],
    };
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <PermissionModal
          onCancel={() => {}}
          onSelect={() => {}}
          request={request as any}
        />
      ),
      { width: 80, height: 30 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Permission Required");
    expect(frame).toContain("Allow");
    expect(frame).toContain("Deny");
  });

  test("renders nothing when request is null", async () => {
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <PermissionModal
          onCancel={() => {}}
          onSelect={() => {}}
          request={null}
        />
      ),
      { width: 80, height: 30 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).not.toContain("Permission Required");
  });
});
