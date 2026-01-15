import { For, Show } from "solid-js";

interface KeyBinding {
  key: string;
  desc: string;
}

const KEYBINDINGS: KeyBinding[] = [
  { key: "1/2/3", desc: "Switch tabs" },
  { key: "Tab", desc: "Cycle tabs" },
  { key: "j/k", desc: "Navigate sessions" },
  { key: "h/l", desc: "Collapse/expand session" },
  { key: "e/Space", desc: "Toggle expand" },
  { key: "p", desc: "Pause/resume session" },
  { key: "s", desc: "Stop session" },
  { key: "x", desc: "Exit session" },
  { key: "o", desc: "Open external" },
  { key: "q/Esc", desc: "Quit" },
  { key: "?", desc: "Help" },
];

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpModal(props: HelpModalProps) {
  return (
    <Show when={props.visible}>
      <box
        flexDirection="column"
        style={{
          position: "absolute",
          top: 2,
          left: 4,
          right: 4,
          bottom: 2,
          padding: 2,
        }}
      >
        <box>
          <text>
            <span style={{ fg: "#00aaff" }}>Ralph Keybindings</span>
            <span style={{ fg: "#666666" }}> (press any key to close)</span>
          </text>
        </box>
        <box style={{ marginTop: 1 }}>
          <text>
            <span style={{ fg: "#444444" }}>{"─".repeat(40)}</span>
          </text>
        </box>
        <box flexDirection="column" style={{ marginTop: 1 }}>
          <For each={KEYBINDINGS}>
            {(binding) => (
              <text>
                <span style={{ fg: "#00ff00" }}>{binding.key.padEnd(10)}</span>
                <span style={{ fg: "#aaaaaa" }}>{binding.desc}</span>
              </text>
            )}
          </For>
        </box>
        <box style={{ marginTop: 1 }}>
          <text>
            <span style={{ fg: "#444444" }}>{"─".repeat(40)}</span>
          </text>
        </box>
      </box>
    </Show>
  );
}
