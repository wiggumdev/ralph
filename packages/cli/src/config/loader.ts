import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { Global } from "#global";
import { type Config, ConfigSchema, DEFAULT_CONFIG } from "./schema";

function loadTomlFile(filePath: string): Partial<Config> {
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return parseToml(content) as Partial<Config>;
  } catch (error) {
    console.warn(`Warning: Failed to parse ${filePath}`);
    console.warn(error instanceof Error ? error.message : String(error));
    console.warn("Using default configuration");
    return {};
  }
}

function deepMerge<T extends Record<string, unknown>>(
  ...objects: Partial<T>[]
): T {
  const result: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result as T;
}

export interface LoadConfigOptions {
  cwd?: string;
  overrides?: Partial<Config>;
}

export async function loadConfig(
  options: LoadConfigOptions = {}
): Promise<Config> {
  const cwd = options.cwd ?? process.cwd();

  // User-level config (~/.ralph/config.toml)
  const userConfigPath = resolve(Global.Path.config, "config.toml");
  const userConfig = loadTomlFile(userConfigPath);

  // Project-level config (.ralph/config.toml)
  const projectConfigPath = resolve(cwd, ".ralph", "config.toml");
  const projectConfig = loadTomlFile(projectConfigPath);

  // Merge: defaults < user < project < CLI overrides
  const merged = deepMerge(
    DEFAULT_CONFIG,
    userConfig,
    projectConfig,
    options.overrides ?? {}
  );

  // Validate and return
  return ConfigSchema.parse(merged);
}

export function getPlansDir(config: Config, cwd: string): string {
  return resolve(cwd, config.plansDir);
}

export function getPrdPath(config: Config, cwd: string): string {
  return resolve(getPlansDir(config, cwd), "prd.json");
}

export function getPromptPath(config: Config, cwd: string): string {
  return resolve(getPlansDir(config, cwd), "PROMPT.md");
}

export function getProgressPath(config: Config, cwd: string): string {
  return resolve(getPlansDir(config, cwd), "progress.txt");
}
