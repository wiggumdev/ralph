import { z } from "zod";

export const AdapterType = z.enum(["claude", "gemini", "opencode"]);
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
  maxIterations: z.number().int().positive().default(10),
  verbose: z.boolean().default(false),
  tui: z.boolean().default(true),
  showUsage: z.boolean().default(false),
  hooks: HooksSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  adapter: "claude",
  plansDir: ".plans",
  maxIterations: 10,
  verbose: false,
  tui: true,
  showUsage: false,
  hooks: {},
};
