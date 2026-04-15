import { type ActorRefFrom, assign, sendTo, setup } from "xstate";
import type { AcpAdapter } from "#adapters/acp";
import type { PermissionResponse } from "#parsers/permission-types";
import { sessionMachine } from "./session-machine";
import type { LoopOptions, TabView } from "./types";

export interface TUIInput {
  adapter: AcpAdapter;
  options: LoopOptions;
  autoExit?: boolean;
  canOpen?: boolean;
}

export interface TUIContext {
  loopRef: ActorRefFrom<typeof sessionMachine> | null;
  currentTab: TabView;
  helpVisible: boolean;
  selectedIndex: number;
  expanded: boolean;
  autoExit: boolean;
  canOpen: boolean;
  // Forwarded from session machine for UI consumption
  adapter: AcpAdapter;
  options: LoopOptions;
}

export type TUIEvent =
  | { type: "SET_TAB"; tab: TabView }
  | { type: "TOGGLE_HELP" }
  | { type: "TOGGLE_EXPAND" }
  | { type: "PERMISSION_RESPONSE"; response: PermissionResponse }
  | { type: "EXIT" }
  | { type: "STOP" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "START_LOOP" };

export const tuiMachine = setup({
  types: {
    context: {} as TUIContext,
    events: {} as TUIEvent,
    input: {} as TUIInput,
  },
  actors: {
    sessionMachine,
  },
}).createMachine({
  id: "tui",
  context: ({ input }) => ({
    loopRef: null,
    currentTab: "loop" as TabView,
    helpVisible: false,
    selectedIndex: 0,
    expanded: true,
    autoExit: input.autoExit ?? false,
    canOpen: input.canOpen ?? false,
    adapter: input.adapter,
    options: input.options,
  }),
  initial: "active",

  states: {
    active: {
      entry: [
        assign({
          loopRef: ({ spawn, context }) =>
            spawn("sessionMachine", {
              id: "loop",
              input: {
                adapter: context.adapter,
                options: context.options,
              },
            }),
        }),
        sendTo(({ context }) => context.loopRef!, { type: "START" }),
      ],

      on: {
        SET_TAB: {
          actions: assign({ currentTab: ({ event }) => event.tab }),
        },

        TOGGLE_HELP: {
          actions: assign({
            helpVisible: ({ context }) => !context.helpVisible,
          }),
        },

        TOGGLE_EXPAND: {
          actions: assign({
            expanded: ({ context }) => !context.expanded,
          }),
        },

        PERMISSION_RESPONSE: {
          actions: ({ context, event }) => {
            context.loopRef?.send({
              type: "PERMISSION_RESPONSE",
              response: event.response,
            });
          },
        },

        STOP: {
          actions: ({ context }) => {
            context.loopRef?.send({ type: "STOP" });
          },
        },

        PAUSE: {
          actions: ({ context }) => {
            context.loopRef?.send({ type: "PAUSE" });
          },
        },

        RESUME: {
          actions: ({ context }) => {
            context.loopRef?.send({ type: "RESUME" });
          },
        },

        EXIT: "exiting",
      },
    },

    exiting: {
      entry: ({ context }) => {
        context.loopRef?.send({ type: "STOP" });
      },
      type: "final",
    },
  },
});
