#!/usr/bin/env bun

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "../package.json";

// Extract base name from scoped package (e.g., "@wiggumdev/ralph" -> "ralph")
const baseName = pkg.name.replace(/^@[^/]+\//, "");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, "..");

const binDir = path.join(os.homedir(), ".local", "bin");
const destPath = path.join(binDir, "ralph");
const platformDirName = [
  baseName,
  process.platform === "win32" ? "windows" : process.platform,
  process.arch,
].join("-");
const binaryPath = path.resolve(dir, `dist/${platformDirName}/bin/ralph`);

if (!fs.existsSync(binaryPath)) {
  console.error(`binary not found: ${binaryPath}`);
  console.error('run "bun run build --single" first');
  process.exit(1);
}

await fs.promises.mkdir(binDir, { recursive: true });
await fs.promises.copyFile(binaryPath, destPath);
await fs.promises.chmod(destPath, 0o755);
console.log(`copied ${binaryPath} -> ${destPath}`);
