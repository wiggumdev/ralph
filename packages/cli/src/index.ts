#!/usr/bin/env bun

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkCommand } from "#commands/check";
import { initCommand } from "#commands/init";
import { runCommand } from "#commands/run";

await yargs(hideBin(process.argv))
  .scriptName("ralph")
  .usage("$0 <command> [options]")
  .command(initCommand)
  .command(runCommand)
  .command(checkCommand)
  .demandCommand(1, "Please specify a command")
  .strict()
  .help("help", "Show help")
  .alias("h", "help")
  .version(false)
  .parse();
