import { type Accessor, createContext, type JSX, useContext } from "solid-js";

export type TabView = "loop" | "learning" | "backlog" | "permissions";

export interface TabContextValue {
  currentTab: Accessor<TabView>;
  setTab: (tab: TabView) => void;
  cycleTab: () => void;
}

const TabContext = createContext<TabContextValue>();

export function TabProvider(props: {
  value: TabContextValue;
  children: JSX.Element;
}) {
  return (
    <TabContext.Provider value={props.value}>
      {props.children}
    </TabContext.Provider>
  );
}

export function useTab(): TabContextValue {
  const ctx = useContext(TabContext);
  if (!ctx) {
    throw new Error("useTab must be used within TabProvider");
  }
  return ctx;
}
