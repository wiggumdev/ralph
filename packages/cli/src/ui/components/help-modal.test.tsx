import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { HelpModal } from "./help-modal";

describe("HelpModal", () => {
  test("renders keybindings when visible", async () => {
    const { captureCharFrame, renderOnce } = await testRender(
      () => <HelpModal onClose={() => {}} visible={true} />,
      { width: 80, height: 30 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("Ralph Keybindings");
    expect(frame).toContain("Switch tabs");
    expect(frame).toContain("Cycle tabs");
    expect(frame).toContain("Navigate sessions");
    expect(frame).toContain("Quit");
  });

  test("renders nothing when not visible", async () => {
    const { captureCharFrame, renderOnce } = await testRender(
      () => <HelpModal onClose={() => {}} visible={false} />,
      { width: 80, height: 30 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).not.toContain("Ralph Keybindings");
  });

  test("shows all key bindings", async () => {
    const { captureCharFrame, renderOnce } = await testRender(
      () => <HelpModal onClose={() => {}} visible={true} />,
      { width: 80, height: 30 }
    );
    await renderOnce();
    const frame = captureCharFrame();
    expect(frame).toContain("1/2/3");
    expect(frame).toContain("Tab");
    expect(frame).toContain("j/k");
    expect(frame).toContain("h/l");
    expect(frame).toContain("e/Space");
    expect(frame).toContain("q/Esc");
    expect(frame).toContain("?");
  });
});
