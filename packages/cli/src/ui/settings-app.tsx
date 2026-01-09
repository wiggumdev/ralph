import { render, useKeyboard, useRenderer } from "@opentui/solid";
import { createSignal, For, Show } from "solid-js";
import type { Config } from "#config/schema";
import { ConfigSchema, AdapterType } from "#config/schema";

export interface SettingsAppProps {
  level: "user" | "project";
  configPath: string;
  rawConfig: Partial<Config>;
  mergedConfig: Config;
  defaults: Config;
  onSave: (config: Partial<Config>) => void;
}

export interface SettingsResult {
  saved: boolean;
}

interface SettingField {
  key: keyof Config;
  label: string;
  type: "string" | "number" | "boolean" | "enum";
  options?: string[];
}

const SETTING_FIELDS: SettingField[] = [
  { key: "adapter", label: "Adapter", type: "enum", options: ["claude", "opencode"] },
  { key: "plansDir", label: "Plans Directory", type: "string" },
  { key: "maxIterations", label: "Max Iterations", type: "number" },
  { key: "verbose", label: "Verbose Output", type: "boolean" },
  { key: "tui", label: "Use TUI", type: "boolean" },
];

function SettingsApp(props: SettingsAppProps & { onComplete: (result: SettingsResult) => void }) {
  const renderer = useRenderer();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [editing, setEditing] = createSignal(false);
  const [editBuffer, setEditBuffer] = createSignal("");
  const [localConfig, setLocalConfig] = createSignal<Partial<Config>>({ ...props.rawConfig });
  const [dirty, setDirty] = createSignal(false);

  const getEffectiveValue = (key: keyof Config): string => {
    const local = localConfig()[key];
    if (local !== undefined) {
      return String(local);
    }
    return String(props.mergedConfig[key]);
  };

  const isOverridden = (key: keyof Config): boolean => {
    return localConfig()[key] !== undefined;
  };

  const getCurrentField = () => SETTING_FIELDS[selectedIndex()];

  const cycleEnumValue = (field: SettingField) => {
    if (!field.options) return;
    const currentValue = getEffectiveValue(field.key);
    const currentIdx = field.options.indexOf(currentValue);
    const nextIdx = (currentIdx + 1) % field.options.length;
    const newValue = field.options[nextIdx];
    setLocalConfig((prev) => ({ ...prev, [field.key]: newValue }));
    setDirty(true);
  };

  const toggleBooleanValue = (field: SettingField) => {
    const currentValue = getEffectiveValue(field.key) === "true";
    setLocalConfig((prev) => ({ ...prev, [field.key]: !currentValue }));
    setDirty(true);
  };

  const startEditing = () => {
    const field = getCurrentField();
    if (field.type === "boolean") {
      toggleBooleanValue(field);
      return;
    }
    if (field.type === "enum") {
      cycleEnumValue(field);
      return;
    }
    setEditBuffer(getEffectiveValue(field.key));
    setEditing(true);
  };

  const finishEditing = () => {
    const field = getCurrentField();
    let value: string | number = editBuffer();

    if (field.type === "number") {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num > 0) {
        setLocalConfig((prev) => ({ ...prev, [field.key]: num }));
        setDirty(true);
      }
    } else {
      if (value.trim()) {
        setLocalConfig((prev) => ({ ...prev, [field.key]: value }));
        setDirty(true);
      }
    }
    setEditing(false);
    setEditBuffer("");
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditBuffer("");
  };

  const resetField = () => {
    const field = getCurrentField();
    setLocalConfig((prev) => {
      const next = { ...prev };
      delete next[field.key];
      return next;
    });
    setDirty(true);
  };

  const saveAndExit = () => {
    props.onSave(localConfig());
    props.onComplete({ saved: true });
    renderer.destroy();
  };

  const exitWithoutSaving = () => {
    props.onComplete({ saved: false });
    renderer.destroy();
  };

  useKeyboard((key) => {
    if (editing()) {
      if (key.name === "return") {
        finishEditing();
      } else if (key.name === "escape") {
        cancelEditing();
      } else if (key.name === "backspace") {
        setEditBuffer((prev) => prev.slice(0, -1));
      } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        setEditBuffer((prev) => prev + key.sequence);
      }
      return;
    }

    if (key.name === "up" || key.name === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "down" || key.name === "j") {
      setSelectedIndex((prev) => Math.min(SETTING_FIELDS.length - 1, prev + 1));
    } else if (key.name === "return" || key.name === "space") {
      startEditing();
    } else if (key.name === "r") {
      resetField();
    } else if (key.name === "s") {
      if (dirty()) {
        saveAndExit();
      }
    } else if (key.name === "q" || key.name === "escape") {
      exitWithoutSaving();
    }
  });

  const levelLabel = () => props.level === "user" ? "User" : "Project";

  return (
    <box flexDirection="column" style={{ padding: 1 }}>
      <box>
        <text>
          <strong>Ralph Settings</strong>
          <span style={{ fg: "#666666" }}> | {levelLabel()} Level</span>
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <text>
          <span style={{ fg: "#666666" }}>{props.configPath}</span>
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <text>
          <span style={{ fg: "#666666" }}>
            [↑/↓] navigate | [Enter] edit | [r] reset | [s] save | [q] quit
          </span>
        </text>
      </box>

      <box flexDirection="column" style={{ marginTop: 1 }}>
        <For each={SETTING_FIELDS}>
          {(field, index) => {
            const isSelected = () => index() === selectedIndex();
            const value = () => getEffectiveValue(field.key);
            const overridden = () => isOverridden(field.key);
            const isEditingThis = () => editing() && isSelected();

            return (
              <box>
                <text>
                  <span style={{ fg: isSelected() ? "#00ff00" : "#ffffff" }}>
                    {isSelected() ? "▶ " : "  "}
                  </span>
                  <span style={{ fg: isSelected() ? "#00ff00" : "#ffffff" }}>
                    {field.label.padEnd(16)}
                  </span>
                  <Show when={isEditingThis()} fallback={
                    <>
                      <span style={{ fg: overridden() ? "#00ffff" : "#888888" }}>
                        {value()}
                      </span>
                      <Show when={!overridden()}>
                        <span style={{ fg: "#555555" }}> (inherited)</span>
                      </Show>
                    </>
                  }>
                    <span style={{ fg: "#ffff00" }}>{editBuffer()}</span>
                    <span style={{ fg: "#ffff00" }}>_</span>
                  </Show>
                </text>
              </box>
            );
          }}
        </For>
      </box>

      <Show when={dirty()}>
        <box style={{ marginTop: 1 }}>
          <text>
            <span style={{ fg: "#ffff00" }}>* Unsaved changes. Press [s] to save.</span>
          </text>
        </box>
      </Show>

      <box style={{ marginTop: 1 }}>
        <text>
          <span style={{ fg: "#666666" }}>
            <span style={{ fg: "#00ffff" }}>cyan</span>=set at this level |{" "}
            <span style={{ fg: "#888888" }}>gray</span>=inherited from parent/defaults
          </span>
        </text>
      </box>
    </box>
  );
}

export function runSettingsTUI(
  props: SettingsAppProps
): Promise<SettingsResult> {
  return new Promise((resolve) => {
    let result: SettingsResult = { saved: false };

    const onComplete = (r: SettingsResult) => {
      result = r;
    };

    render(() => <SettingsApp {...props} onComplete={onComplete} />, {
      onDestroy: () => {
        setTimeout(() => {
          resolve(result);
        }, 100);
      },
    });
  });
}

export { SettingsApp };
