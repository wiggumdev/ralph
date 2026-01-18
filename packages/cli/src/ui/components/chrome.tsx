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
      <scrollbox
        flexDirection="column"
        stickyScroll
        style={{ flexGrow: 1, marginTop: 1 }}
      >
        {props.children}
      </scrollbox>
      <Footer />
    </box>
  );
}

function Footer() {
  return (
    <box flexDirection="row" style={{ flexGrow: 1, marginTop: 1 }}>
      <text>
        <span style={{ fg: "#333333" }} />
      </text>
    </box>
  );
}
