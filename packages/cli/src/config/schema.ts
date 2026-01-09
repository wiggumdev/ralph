import { z } from "zod";

export const AdapterType = z.enum(["claude", "opencode"]);
export type AdapterType = z.infer<typeof AdapterType>;

// Model types for Claude adapter
export const ClaudeModelType = z.enum([
  "claude-sonnet-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-haiku-3-5-20241022",
  "sonnet",
  "opus",
  "haiku",
]);
export type ClaudeModelType = z.infer<typeof ClaudeModelType>;

// Model types for OpenCode adapter
export const OpenCodeModelType = z.enum([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "o1",
  "o1-mini",
]);
export type OpenCodeModelType = z.infer<typeof OpenCodeModelType>;

// Combined model type for CLI argument choices
export const ModelType = z.union([ClaudeModelType, OpenCodeModelType]);
export type ModelType = z.infer<typeof ModelType>;

// All available model choices for CLI
export const ALL_MODEL_CHOICES = [
  ...ClaudeModelType.options,
  ...OpenCodeModelType.options,
] as const;

export const ConfigSchema = z.object({
  adapter: AdapterType.default("claude"),
  plansDir: z.string().default(".plans"),
  maxIterations: z.number().int().positive().default(10),
  verbose: z.boolean().default(false),
  tui: z.boolean().default(true),
  model: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  adapter: "claude",
  plansDir: ".plans",
  maxIterations: 10,
  verbose: false,
  tui: true,
  model: undefined,
};
