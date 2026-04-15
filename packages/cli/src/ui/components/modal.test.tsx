import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { Modal } from "./modal";

describe("Modal", () => {
  test("renders children when visible", async () => {
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <Modal visible={true}>
          <text>Modal Content</text>
        </Modal>
      ),
      { width: 80, height: 24 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Modal Content");
  });

  test("renders nothing when not visible", async () => {
    const { captureCharFrame, renderOnce } = await testRender(
      () => (
        <Modal visible={false}>
          <text>Hidden Content</text>
        </Modal>
      ),
      { width: 80, height: 24 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).not.toContain("Hidden Content");
  });
});
