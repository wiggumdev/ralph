import { createMemo, For, Show } from "solid-js";
import type { PrdFeature } from "#schema/prd";

export type PassFilter = "all" | "passing" | "failing";

export interface PrdItemsTabProps {
  items: PrdFeature[];
  searchQuery: string;
  passFilter: PassFilter;
}

function PrdItem(props: { expanded: boolean; item: PrdFeature }) {
  const statusIcon = () => (props.item.passes ? "✓" : "○");
  const statusColor = () => (props.item.passes ? "#00ff00" : "#ff6600");

  return (
    <box flexDirection="column" style={{ marginBottom: 1 }}>
      <box>
        <text>
          <span style={{ fg: statusColor() }}>{statusIcon()} </span>
          <span style={{ fg: "#888888" }}>[{props.item.category}]</span>{" "}
          <strong>{props.item.title}</strong>
        </text>
      </box>
      <Show when={props.expanded}>
        <box style={{ marginLeft: 2 }}>
          <text selectable selectionBg="#264F78" selectionFg="#FFFFFF">
            <span style={{ fg: "#aaaaaa" }}>{props.item.description}</span>
          </text>
        </box>
        <box flexDirection="column" style={{ marginLeft: 2, marginTop: 1 }}>
          <text>
            <span style={{ fg: "#666666" }}>Acceptance criteria:</span>
          </text>
          <For each={props.item.acceptance}>
            {(criterion) => (
              <box style={{ marginLeft: 2 }}>
                <text>
                  <span style={{ fg: "#888888" }}>• {criterion}</span>
                </text>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  );
}

export function PrdItemsTab(props: PrdItemsTabProps) {
  const filteredItems = createMemo(() => {
    let items = props.items;

    // Apply pass filter
    if (props.passFilter === "passing") {
      items = items.filter((item) => item.passes);
    } else if (props.passFilter === "failing") {
      items = items.filter((item) => !item.passes);
    }

    // Apply search filter
    if (props.searchQuery.trim()) {
      const query = props.searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    return items;
  });

  const stats = createMemo(() => {
    const passing = props.items.filter((i) => i.passes).length;
    const total = props.items.length;
    return { passing, failing: total - passing, total };
  });

  return (
    <box flexDirection="column" style={{ flexGrow: 1 }}>
      <box style={{ marginBottom: 1 }}>
        <text>
          <span style={{ fg: "#00ff00" }}>✓ {stats().passing}</span>
          <span style={{ fg: "#666666" }}> | </span>
          <span style={{ fg: "#ff6600" }}>○ {stats().failing}</span>
          <span style={{ fg: "#666666" }}> | Total: {stats().total}</span>
          <Show when={props.searchQuery}>
            <span style={{ fg: "#666666" }}>
              {" "}
              | Search: "{props.searchQuery}"
            </span>
          </Show>
          <Show when={props.passFilter !== "all"}>
            <span style={{ fg: "#666666" }}> | Filter: {props.passFilter}</span>
          </Show>
        </text>
      </box>

      <scrollbox border style={{ flexGrow: 1 }}>
        <Show
          fallback={
            <text>
              <span style={{ fg: "#666666" }}>No items match the criteria</span>
            </text>
          }
          when={filteredItems().length > 0}
        >
          <For each={filteredItems()}>
            {(item) => <PrdItem expanded={false} item={item} />}
          </For>
        </Show>
      </scrollbox>
    </box>
  );
}
