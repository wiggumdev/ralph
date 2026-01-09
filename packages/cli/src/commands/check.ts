import { existsSync, readFileSync } from "node:fs";
import type { CommandModule } from "yargs";
import { getPrdPath, loadConfig } from "#config/loader";
import { validatePrd } from "#schema/prd";

interface CheckArgs {
  cwd?: string;
}

export const checkCommand: CommandModule<object, CheckArgs> = {
  command: "check",
  describe: "Validate prd.json against schema",

  builder: (yargs) =>
    yargs.option("cwd", {
      alias: "c",
      type: "string",
      describe: "Working directory",
    }),

  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const config = await loadConfig({ cwd });
    const prdPath = getPrdPath(config, cwd);

    if (!existsSync(prdPath)) {
      console.error(`Error: ${prdPath} not found`);
      console.error("Run 'ralph init' to create project files");
      process.exit(1);
    }

    let data: unknown;
    try {
      const content = readFileSync(prdPath, "utf-8");
      data = JSON.parse(content);
    } catch (error) {
      console.error(`Error: Failed to parse ${prdPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const result = validatePrd(data);

    if (result.valid) {
      console.log(`prd.json is valid (${result.data?.length} features)`);
      process.exit(0);
    }

    console.error("prd.json validation failed:");
    for (const error of result.errors ?? []) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  },
};
