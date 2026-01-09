#!/usr/bin/env bun

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkCommand } from "#commands/check";
import { configCommand } from "#commands/config";
import { initCommand } from "#commands/init";
import { runCommand } from "#commands/run";
import { Log } from "#log";

process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: e instanceof Error ? e.message : e,
  });
  process.exitCode = 1;
});

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: e instanceof Error ? e.message : e,
  });
  process.exitCode = 1;
});

await yargs(hideBin(process.argv))
  .scriptName("ralph")
  .usage("$0 <command> [options]")
  .command(initCommand)
  .command(runCommand)
  .command(checkCommand)
  .command(configCommand)
  .demandCommand(1, "Please specify a command")
  .strict()
  .help("help", "Show help")
  .alias("h", "help")
  .version(false)
  .parse();
