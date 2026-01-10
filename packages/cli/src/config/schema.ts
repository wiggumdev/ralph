import { z } from "zod";

export const AdapterType = z.enum(["claude", "opencode", "kilo"]);
export type AdapterType = z.infer<typeof AdapterType>;

export const ConfigSchema = z.object({
  adapter: AdapterType.default("claude"),
  plansDir: z.string().default(".plans"),
  maxIterations: z.number().int().positive().default(10),
  verbose: z.boolean().default(false),
  tui: z.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  adapter: "claude",
  plansDir: ".plans",
  maxIterations: 10,
  verbose: false,
  tui: true,
};
