import { z } from "zod";

export const AdapterType = z.enum(["claude", "gemini", "opencode", "copilot"]);
export type AdapterType = z.infer<typeof AdapterType>;

export const HooksSchema = z.object({
  ralph_start: z.string().optional(),
  ralph_loop_start: z.string().optional(),
  ralph_loop_end: z.string().optional(),
  ralph_complete: z.string().optional(),
  ralph_max_iterations: z.string().optional(),
});

export type Hooks = z.infer<typeof HooksSchema>;

export const ConfigSchema = z.object({
  adapter: AdapterType.default("claude"),
  plansDir: z.string().default(".plans"),
  maxIterations: z.number().int().positive().optional(),
  debug: z.boolean().default(false),
  tui: z.boolean().default(true),
  showUsage: z.boolean().default(false),
  yolo: z.boolean().default(false),
  transportLog: z.boolean().default(false),
  hooks: HooksSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  adapter: "claude",
  plansDir: ".plans",
  maxIterations: undefined,
  debug: false,
  tui: true,
  showUsage: false,
  yolo: false,
  transportLog: false,
  hooks: {},
};
