import {
  type Accessor,
  createContext,
  type JSX,
  type Setter,
  useContext,
} from "solid-js";

export interface UIContextValue {
  expanded: Accessor<boolean>;
  setExpanded: Setter<boolean>;
  helpVisible: Accessor<boolean>;
  setHelpVisible: Setter<boolean>;
}

const UIContext = createContext<UIContextValue>();

export function UIProvider(props: {
  value: UIContextValue;
  children: JSX.Element;
}) {
  return (
    <UIContext.Provider value={props.value}>
      {props.children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within UIProvider");
  }
  return ctx;
}
