import type { JSX } from "solid-js";
import { useTab } from "#ui/contexts/tab-context";
import { TabBar } from "./tab-bar";

interface ChromeProps {
  children: JSX.Element;
}

export function Chrome(props: ChromeProps) {
  const { currentTab } = useTab();

  return (
    <box flexDirection="column" style={{ padding: 1 }}>
      <TabBar currentTab={currentTab} />
      <box flexDirection="column" style={{ flexGrow: 1, marginTop: 1 }}>
        {props.children}
      </box>
      <Footer />
    </box>
  );
}

function Footer() {
  return (
    <text>
      <span style={{ fg: "#333333" }}>
        [1-3] tabs | [tab] cycle | [e] expand | [?] help | [q] quit
      </span>
    </text>
  );
}
