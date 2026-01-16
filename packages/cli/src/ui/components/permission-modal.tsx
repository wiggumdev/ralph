import type { PermissionOption } from "@agentclientprotocol/sdk";
import { For, Show } from "solid-js";
import type { PermissionRequest } from "#parsers/permission-types";

interface PermissionModalProps {
  request: PermissionRequest | null;
  onSelect: (optionId: string) => void;
  onCancel: () => void;
}

function getOptionColor(kind: PermissionOption["kind"]): string {
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

function getKindLabel(kind: PermissionOption["kind"]): string {
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

export function PermissionModal(props: PermissionModalProps) {
  return (
    <Show when={props.request}>
      {(request: () => PermissionRequest) => (
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
              <span style={{ fg: "#ffaa00" }}>Permission Required</span>
            </text>
          </box>
          <box style={{ marginTop: 1 }}>
            <text>
              <span style={{ fg: "#444444" }}>{"─".repeat(50)}</span>
            </text>
          </box>
          <box style={{ marginTop: 1 }}>
            <text>
              <span style={{ fg: "#aaaaaa" }}>Tool: </span>
              <span style={{ fg: "#00aaff" }}>
                {request().toolCall.title ?? request().toolCall.toolCallId}
              </span>
            </text>
          </box>
          <Show when={request().toolCall.kind}>
            <box>
              <text>
                <span style={{ fg: "#aaaaaa" }}>Kind: </span>
                <span style={{ fg: "#888888" }}>{request().toolCall.kind}</span>
              </text>
            </box>
          </Show>
          <box style={{ marginTop: 1 }}>
            <text>
              <span style={{ fg: "#444444" }}>{"─".repeat(50)}</span>
            </text>
          </box>
          <box flexDirection="column" style={{ marginTop: 1 }}>
            <For each={request().options}>
              {(option, index) => (
                <text>
                  <span style={{ fg: "#888888" }}>[{index() + 1}] </span>
                  <span style={{ fg: getOptionColor(option.kind) }}>
                    {option.name}
                  </span>
                  <span style={{ fg: "#666666" }}>
                    {" "}
                    ({getKindLabel(option.kind)})
                  </span>
                </text>
              )}
            </For>
          </box>
          <box style={{ marginTop: 1 }}>
            <text>
              <span style={{ fg: "#444444" }}>{"─".repeat(50)}</span>
            </text>
          </box>
          <box style={{ marginTop: 1 }}>
            <text>
              <span style={{ fg: "#666666" }}>
                Press [1-{request().options.length}] to select, [Esc] to cancel
              </span>
            </text>
          </box>
        </box>
      )}
    </Show>
  );
}
