import { type Accessor, createContext, type JSX, useContext } from "solid-js";
import type {
  SessionItem,
  SessionState,
  TodoItem,
} from "#parsers/message-types";
import type { PrdFeature } from "#schema/prd";

export type AppStatus = "running" | "complete" | "error" | "idle" | "paused";

export interface AppStateContextValue {
  sessions: Accessor<SessionState[]>;
  activeSession: Accessor<SessionState | undefined>;
  status: Accessor<AppStatus>;
  iteration: Accessor<number>;
  maxIterations: Accessor<number>;
  totalInputTokens: Accessor<number>;
  totalOutputTokens: Accessor<number>;
  totalCost: Accessor<number>;
  toolCallCount: Accessor<number>;
  prdItems: Accessor<PrdFeature[]>;
  // Derived from activeSession for convenience
  items: Accessor<SessionItem[]>;
  todos: Accessor<TodoItem[]>;
}

const AppStateContext = createContext<AppStateContextValue>();

export function AppStateProvider(props: {
  value: AppStateContextValue;
  children: JSX.Element;
}) {
  return (
    <AppStateContext.Provider value={props.value}>
      {props.children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
