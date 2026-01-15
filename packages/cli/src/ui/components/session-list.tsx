import type { Accessor } from "solid-js";
import { For } from "solid-js";
import type { SessionState } from "#parsers/message-types";
import { SessionContainer } from "./session-container";

export interface SessionListProps {
  sessions: SessionState[];
  expanded: boolean;
  selectedIndex: Accessor<number>;
  onToggleSession: (index: number) => void;
}

export function SessionList(props: SessionListProps) {
  return (
    <scrollbox
      stickyScroll
      stickyStart="bottom"
      style={{ marginTop: 1, flexGrow: 1 }}
    >
      <For each={props.sessions}>
        {(session, index) => (
          <SessionContainer
            expanded={props.expanded}
            onToggle={() => props.onToggleSession(index())}
            selected={index() === props.selectedIndex()}
            session={session}
          />
        )}
      </For>
    </scrollbox>
  );
}
