import { z } from "zod";

export const AdapterType = z.enum(["claude", "gemini", "opencode"]);
export type AdapterType = z.infer<typeof AdapterType>;

export const ConfigSchema = z.object({
  adapter: AdapterType.default("claude"),
  plansDir: z.string().default(".plans"),
  maxIterations: z.number().int().positive().default(10),
  verbose: z.boolean().default(false),
  tui: z.boolean().default(true),
  showUsage: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  adapter: "claude",
  plansDir: ".plans",
  maxIterations: 10,
  verbose: false,
  tui: true,
  showUsage: false,
};
