import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import type { CommandModule } from "yargs";
import type { AdapterType } from "#config/schema";

const PROMPT_TEMPLATE = `You are continuing work on a long-running autonomous development task. This is a FRESH context window - you have no memory of previous sessions.

@.plans/prd.json @.plans/progress.txt

1. Find the highest-priority feature to work on and work only on that feature. This should be the one YOU decide has the highest priority - not necessarily the first in the list

2. Before changes, search codebase (don't assume not implemented).

3. Implement the requirements for the selected feature using TDD.

3. Run typecheck and tests: \`bun run typecheck && bun run test\`

4. Update prd.json marking completed work (CAREFULLY!)

**YOU CAN ONLY MODIFY ONE FIELD: "passes"**

After thorough verification, change:
\`\`\`json
"passes": false
\`\`\`
to:
\`\`\`json
"passes": true
\`\`\`

5. Append learnings to .plans/progress.txt for future iterations.

6. Commit changes: \`jj commit -m "description"\`

ONLY WORK ON A SINGLE FEATURE PER ITERATION.

If all features complete, output <promise>COMPLETE</promise>

When you learn something new about how to run commands or patterns in the code make sure you update @CLAUDE.md using a subagent but keep it brief.

Remember: You have unlimited time across many sessions. Focus on quality over speed. Production-ready is the goal.
`;

const PRD_TEMPLATE = [
  {
    category: "example",
    title: "Example Feature",
    description: "Replace this with your first feature",
    passes: false,
    acceptance: ["Acceptance criteria 1", "Acceptance criteria 2"],
  },
];

async function prompt(
  question: string,
  defaultValue?: string
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((res) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      res(answer.trim() || defaultValue || "");
    });
  });
}

async function selectAdapter(): Promise<AdapterType> {
  console.log("\nSelect AI CLI adapter:");
  console.log("  1. claude (Claude Code CLI)");
  console.log("  2. opencode (OpenCode CLI)");
  console.log("  3. gemini (Gemini CLI)");

  const choice = await prompt("Choice", "1");
  if (choice === "2") {
    return "opencode";
  }
  if (choice === "3") {
    return "gemini";
  }
  return "claude";
}

interface InitArgs {
  cwd?: string;
  force?: boolean;
}

export const initCommand: CommandModule<object, InitArgs> = {
  command: "init",
  describe: "Initialize Ralph in current project",

  builder: (yargs) =>
    yargs
      .option("cwd", {
        alias: "c",
        type: "string",
        describe: "Working directory",
      })
      .option("force", {
        alias: "f",
        type: "boolean",
        describe: "Overwrite existing files",
        default: false,
      }),

  handler: async (argv) => {
    const cwd = argv.cwd ?? process.cwd();
    const force = argv.force ?? false;

    console.log("Initializing Ralph project...\n");

    // Get configuration
    let plansDir = await prompt("Plans directory", ".plans");
    if (!plansDir.trim()) {
      plansDir = ".plans";
    }
    const adapter = await selectAdapter();

    const plansDirPath = path.resolve(cwd, plansDir);
    const configDirPath = path.resolve(cwd, ".ralph");
    const configPath = path.resolve(configDirPath, "config.toml");

    // Check for existing files
    if (!force && existsSync(configPath)) {
      console.error(`\nError: ${configPath} already exists`);
      console.error("Use --force to overwrite");
      process.exit(1);
    }

    // Create directories
    mkdirSync(plansDirPath, { recursive: true });
    mkdirSync(configDirPath, { recursive: true });

    // Write config
    const configContent = `# Ralph configuration
adapter = "${adapter}"
plansDir = "${plansDir}"
debug = false
tui = true
`;
    writeFileSync(configPath, configContent);
    console.log(`\nCreated ${configPath}`);

    // Write PRD template
    const prdPath = path.resolve(plansDirPath, "prd.json");
    if (!existsSync(prdPath) || force) {
      writeFileSync(prdPath, JSON.stringify(PRD_TEMPLATE, null, 2));
      console.log(`Created ${prdPath}`);
    }

    // Write prompt template
    const promptPath = path.resolve(plansDirPath, "PROMPT.md");
    if (!existsSync(promptPath) || force) {
      writeFileSync(promptPath, PROMPT_TEMPLATE);
      console.log(`Created ${promptPath}`);
    }

    // Write progress file
    const progressPath = path.resolve(plansDirPath, "progress.txt");
    if (!existsSync(progressPath) || force) {
      writeFileSync(progressPath, "# Progress Log\n\n");
      console.log(`Created ${progressPath}`);
    }

    console.log("\nRalph initialized successfully!");
    console.log("\nNext steps:");
    console.log(`  1. Edit ${prdPath} to define your features`);
    console.log(`  2. Run 'ralph run -n 5' to start the agent loop`);
  },
};
