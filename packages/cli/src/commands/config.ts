import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CommandModule } from "yargs";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { Global } from "#global";
import { type Config, ConfigSchema, DEFAULT_CONFIG } from "#config/schema";
import { loadConfig } from "#config/loader";
import { runSettingsTUI } from "#ui/settings-app";

type ConfigLevel = "user" | "project";

interface ConfigArgs {
  level?: ConfigLevel;
  cwd?: string;
}

function getConfigPath(level: ConfigLevel, cwd: string): string {
  if (level === "user") {
    return path.resolve(Global.Path.config, "config.toml");
  }
  return path.resolve(cwd, ".ralph", "config.toml");
}

function loadRawConfig(filePath: string): Partial<Config> {
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return parseToml(content) as Partial<Config>;
  } catch {
    return {};
  }
}

function saveConfig(filePath: string, config: Partial<Config>): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const header =
    filePath.includes(".ralph")
      ? "# Ralph project configuration\n"
      : "# Ralph user configuration\n";

  writeFileSync(filePath, header + stringifyToml(config));
}

export const configCommand: CommandModule<object, ConfigArgs> = {
  command: "config",
  describe: "Open settings UI to configure Ralph",

  builder: (yargs) =>
    yargs
      .option("level", {
        alias: "l",
        type: "string",
        choices: ["user", "project"] as const,
        describe: "Configuration level to edit",
        default: "project" as ConfigLevel,
      })
      .option("cwd", {
        alias: "c",
        type: "string",
        describe: "Working directory (for project config)",
      }),

  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const level = argv.level ?? "project";

    // Load current merged config for display
    const mergedConfig = await loadConfig({ cwd });

    // Load the raw config at the specified level
    const configPath = getConfigPath(level, cwd);
    const rawConfig = loadRawConfig(configPath);

    // Run the settings TUI
    const result = await runSettingsTUI({
      level,
      configPath,
      rawConfig,
      mergedConfig,
      defaults: DEFAULT_CONFIG,
      onSave: (updatedConfig) => {
        saveConfig(configPath, updatedConfig);
      },
    });

    if (result.saved) {
      console.log(`\nConfiguration saved to ${configPath}`);
    } else {
      console.log("\nConfiguration unchanged.");
    }
  },
};
