#!/usr/bin/env bun

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const binDir = path.join(os.homedir(), ".local", "bin");
const targets = ["ralph", "ralph-dev"];

for (const name of targets) {
  const filePath = path.join(binDir, name);
  if (fs.existsSync(filePath)) {
    await fs.promises.rm(filePath);
    console.log(`removed ${filePath}`);
  }
}
