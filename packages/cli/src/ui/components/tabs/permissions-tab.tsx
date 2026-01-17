import { For, Show } from "solid-js";
import type { PermissionSummary } from "#parsers/permission-types";

interface PermissionsTabProps {
  summary: PermissionSummary[];
}

export function PermissionsTab(props: PermissionsTabProps) {
  const allowed = () => props.summary.filter((s) => s.status === "allowed");
  const denied = () => props.summary.filter((s) => s.status === "denied");

  const jsonArray = () => {
    const names = allowed().map((p) => `  ${JSON.stringify(p.formattedName)}`);
    if (names.length === 0) {
      return "[]";
    }
    return `[\n${names.join(",\n")}\n]`;
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        fallback={
          <text>
            <span style={{ fg: "#666666" }}>
              No permissions tracked yet. Trigger permission prompts to see them
              here.
            </span>
          </text>
        }
        when={props.summary.length > 0}
      >
        <box flexDirection="column">
          <text>
            <span style={{ fg: "#888888" }}>
              Add to .claude/settings.local.json "permissions.allow":
            </span>
          </text>
          <text> </text>
          <text>
            <span style={{ fg: "#00ff00" }}>{jsonArray()}</span>
          </text>
        </box>

        <Show when={denied().length > 0}>
          <box flexDirection="column" marginTop={1}>
            <text>
              <span style={{ fg: "#ff6666" }}>Denied ({denied().length}):</span>
            </text>
            <For each={denied()}>
              {(perm) => (
                <text>
                  <span style={{ fg: "#ff6666" }}>
                    {"  "}"{perm.formattedName}"
                    {perm.count > 1 ? ` (${perm.count}x)` : ""}
                  </span>
                </text>
              )}
            </For>
          </box>
        </Show>

        <box marginTop={1}>
          <text>
            <span style={{ fg: "#666666" }}>
              Allowed: {allowed().length} | Denied: {denied().length}
            </span>
          </text>
        </box>
      </Show>
    </box>
  );
}
