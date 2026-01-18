import type {
  PermissionOption,
  ToolCallUpdate,
} from "@agentclientprotocol/sdk";
import { For, Show } from "solid-js";
import type { PermissionRequest } from "#parsers/permission-types";
import { formatToolDisplay } from "#utils/tool-formatter";
import { Modal } from "./modal";

function formatToolCall(
  toolCall: ToolCallUpdate,
  resolvedToolName?: string
): string {
  const claudeCode = (
    toolCall._meta as { claudeCode?: { toolName?: string } } | undefined
  )?.claudeCode;
  const name =
    resolvedToolName ??
    claudeCode?.toolName ??
    toolCall.title ??
    toolCall.toolCallId;
  const input = (toolCall.rawInput as Record<string, unknown>) || {};
  return formatToolDisplay(name, input, 40);
}

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
    <Modal visible={!!props.request}>
      <Show when={props.request}>
        {(request: () => PermissionRequest) => (
          <>
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
                  {formatToolCall(
                    request().toolCall,
                    request().resolvedToolName
                  )}
                </span>
              </text>
            </box>
            <Show when={request().toolCall.kind}>
              <box>
                <text>
                  <span style={{ fg: "#aaaaaa" }}>Kind: </span>
                  <span style={{ fg: "#888888" }}>
                    {request().toolCall.kind}
                  </span>
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
                  Press [1-{request().options.length}] to select, [Esc] to
                  cancel
                </span>
              </text>
            </box>
          </>
        )}
      </Show>
    </Modal>
  );
}
