import { assign, setup } from "xstate";
import { Log } from "#log";
import {
  completeSession,
  computeTotals,
  flushTextBuffer,
  flushThinkingBuffer,
  initSession,
  processMessage,
} from "./actions/message-actions";
import {
  queuePermission,
  resolvePermission,
  trackPermission,
} from "./actions/permission-actions";
import { adapterSource } from "./actors/adapter-source";
import type { LoopContext, LoopEvent, LoopInput } from "./types";

const log = Log.create({ service: "session-machine" });

function createInitialContext(input: LoopInput): LoopContext {
  return {
    sessions: [],
    currentSession: null,
    iteration: 1,
    maxIterations: input.options.maxIterations,
    promiseComplete: false,
    messageCount: 0,
    textBuffer: "",
    thinkingBuffer: "",
    accumulatedTextItemId: null,
    accumulatedThinkingItemId: null,
    pendingPermissions: new Map(),
    currentPermissionId: null,
    trackedPermissions: new Map(),
    activeAgentStack: [],
    itemIdCounter: 0,
    adapter: input.adapter,
    options: input.options,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    toolCallCount: 0,
    prdItems: [],
    permissionSummary: [],
  };
}

export const sessionMachine = setup({
  types: {
    context: {} as LoopContext,
    events: {} as LoopEvent,
    input: {} as LoopInput,
  },
  actors: {
    adapterSource,
  },
  guards: {
    hasMoreIterations: ({ context }) => {
      if (context.promiseComplete) {
        return false;
      }
      if (context.maxIterations === undefined) {
        return true;
      }
      return context.iteration < context.maxIterations;
    },
    isPromiseComplete: ({ context }) => context.promiseComplete,
    isSystemMessage: ({ event }) =>
      (event as { message: { type: string } }).message.type === "system",
    isContentMessage: ({ event }) => {
      const t = (event as { message: { type: string } }).message.type;
      return t === "text_delta" || t === "thinking_delta" || t === "message";
    },
  },
}).createMachine({
  id: "loop",
  context: ({ input }) => createInitialContext(input),
  initial: "idle",

  states: {
    idle: {
      on: {
        START: {
          target: "running",
        },
      },
    },

    running: {
      initial: "initializing",

      entry: assign(({ context }) => {
        log.debug("iteration_start", { iteration: context.iteration });
        const sessionUpdates = initSession(context);
        return { ...sessionUpdates, messageCount: 0 } as Partial<LoopContext>;
      }),

      invoke: {
        id: "adapter",
        src: "adapterSource",
        input: ({ context }) => ({
          adapter: context.adapter,
          prompt: context.options.prompt,
          options: context.options,
        }),
      },

      states: {
        initializing: {
          entry: () => log.debug("sub_state", { state: "initializing" }),
          on: {
            MESSAGE: [
              {
                guard: "isSystemMessage",
                target: "prompting",
                actions: assign(({ context, event }) => {
                  const count = context.messageCount + 1;
                  log.debug("message_received", {
                    count,
                    type: event.message.type,
                  });
                  const updates = processMessage(context, event.message);
                  const mergedCtx = { ...context, ...updates };
                  const totals = computeTotals(mergedCtx.sessions);
                  return {
                    ...updates,
                    messageCount: count,
                    totalInputTokens: totals.inputTokens,
                    totalOutputTokens: totals.outputTokens,
                    totalCost: totals.cost,
                    toolCallCount: totals.toolCallCount,
                  };
                }),
              },
              {
                actions: assign(({ context, event }) => {
                  const count = context.messageCount + 1;
                  log.debug("message_received", {
                    count,
                    type: event.message.type,
                  });
                  const updates = processMessage(context, event.message);
                  const mergedCtx = { ...context, ...updates };
                  const totals = computeTotals(mergedCtx.sessions);
                  return {
                    ...updates,
                    messageCount: count,
                    totalInputTokens: totals.inputTokens,
                    totalOutputTokens: totals.outputTokens,
                    totalCost: totals.cost,
                    toolCallCount: totals.toolCallCount,
                  };
                }),
              },
            ],
          },
        },
        prompting: {
          entry: () => log.debug("sub_state", { state: "prompting" }),
          on: {
            MESSAGE: [
              {
                guard: "isContentMessage",
                target: "streaming",
                actions: assign(({ context, event }) => {
                  const count = context.messageCount + 1;
                  log.debug("message_received", {
                    count,
                    type: event.message.type,
                  });
                  const updates = processMessage(context, event.message);
                  const mergedCtx = { ...context, ...updates };
                  const totals = computeTotals(mergedCtx.sessions);
                  return {
                    ...updates,
                    messageCount: count,
                    totalInputTokens: totals.inputTokens,
                    totalOutputTokens: totals.outputTokens,
                    totalCost: totals.cost,
                    toolCallCount: totals.toolCallCount,
                  };
                }),
              },
              {
                actions: assign(({ context, event }) => {
                  const count = context.messageCount + 1;
                  log.debug("message_received", {
                    count,
                    type: event.message.type,
                  });
                  const updates = processMessage(context, event.message);
                  const mergedCtx = { ...context, ...updates };
                  const totals = computeTotals(mergedCtx.sessions);
                  return {
                    ...updates,
                    messageCount: count,
                    totalInputTokens: totals.inputTokens,
                    totalOutputTokens: totals.outputTokens,
                    totalCost: totals.cost,
                    toolCallCount: totals.toolCallCount,
                  };
                }),
              },
            ],
          },
        },
        streaming: {
          entry: () => log.debug("sub_state", { state: "streaming" }),
          on: {
            MESSAGE: {
              actions: assign(({ context, event }) => {
                const count = context.messageCount + 1;
                log.debug("message_received", {
                  count,
                  type: event.message.type,
                });
                const updates = processMessage(context, event.message);
                const mergedCtx = { ...context, ...updates };
                const totals = computeTotals(mergedCtx.sessions);
                return {
                  ...updates,
                  messageCount: count,
                  totalInputTokens: totals.inputTokens,
                  totalOutputTokens: totals.outputTokens,
                  totalCost: totals.cost,
                  toolCallCount: totals.toolCallCount,
                };
              }),
            },
          },
        },
        completing: {
          entry: () => log.debug("sub_state", { state: "completing" }),
          always: [
            {
              guard: "isPromiseComplete",
              target: "#loop.complete",
              actions: () =>
                log.debug("promise_complete_exit", { target: "complete" }),
            },
            {
              guard: "hasMoreIterations",
              target: "#loop.nextIteration",
              actions: () =>
                log.debug("iteration_complete_exit", {
                  target: "nextIteration",
                }),
            },
            {
              target: "#loop.complete",
              actions: () =>
                log.debug("all_iterations_complete_exit", {
                  target: "complete",
                }),
            },
          ],
        },
      },

      on: {
        PERMISSION_REQUEST: {
          actions: assign(({ context, event }) =>
            queuePermission(context, event.request, event.resolve)
          ),
        },

        PERMISSION_TRACKED: {
          actions: assign(({ context, event }) =>
            trackPermission(context, event.formattedName, event.status)
          ),
        },

        PERMISSION_RESPONSE: {
          actions: assign(({ context, event }) =>
            resolvePermission(context, event.response)
          ),
        },

        COMPLETE: {
          target: ".completing",
          actions: assign(({ context }) => {
            log.debug("complete_received", {
              iteration: context.iteration,
            });
            return completeSession(context);
          }),
        },

        ERROR: {
          target: "error",
          actions: assign(({ context, event }) => {
            log.error("iteration_error", {
              iteration: context.iteration,
              error: event.error.message,
            });
            const flushUpdates = {
              ...flushTextBuffer(),
              ...flushThinkingBuffer(),
            };
            const sessionUpdates = context.currentSession
              ? {
                  currentSession: null,
                  sessions: [
                    ...context.sessions.slice(0, -1),
                    {
                      ...context.currentSession,
                      status: "error" as const,
                      endTime: Date.now(),
                    },
                  ],
                }
              : {};
            return {
              ...flushUpdates,
              ...sessionUpdates,
              error: event.error,
            };
          }),
        },

        STOP: {
          target: "stopped",
          actions: assign(({ context }) => {
            const sessionUpdates =
              context.currentSession?.status === "running"
                ? {
                    currentSession: {
                      ...context.currentSession,
                      status: "stopped" as const,
                    },
                    sessions: [
                      ...context.sessions.slice(0, -1),
                      {
                        ...context.currentSession,
                        status: "stopped" as const,
                      },
                    ],
                  }
                : {};
            return sessionUpdates;
          }),
        },

        PAUSE: {
          target: "paused",
          actions: assign(({ context }) => {
            if (context.currentSession?.status === "running") {
              const paused = {
                ...context.currentSession,
                status: "paused" as const,
              };
              return {
                currentSession: paused,
                sessions: [...context.sessions.slice(0, -1), paused],
              };
            }
            return {};
          }),
        },
      },
    },

    nextIteration: {
      after: {
        100: {
          target: "running",
          actions: assign(({ context }) => ({
            iteration: context.iteration + 1,
          })),
        },
      },
    },

    paused: {
      on: {
        RESUME: {
          target: "running",
          actions: assign(({ context }) => {
            if (context.currentSession?.status === "paused") {
              const resumed = {
                ...context.currentSession,
                status: "running" as const,
              };
              return {
                currentSession: resumed,
                sessions: [...context.sessions.slice(0, -1), resumed],
              };
            }
            return {};
          }),
        },
        STOP: {
          target: "stopped",
        },
      },
    },

    complete: {
      type: "final",
    },

    error: {
      type: "final",
    },

    stopped: {
      type: "final",
    },
  },
});
