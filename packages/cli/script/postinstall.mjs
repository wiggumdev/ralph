#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// npm scope for scoped package names
const NPM_SCOPE = "@wiggumdev";

function detectPlatformAndArch() {
  // Map platform names
  let platform;
  switch (os.platform()) {
    case "darwin":
      platform = "darwin";
      break;
    case "linux":
      platform = "linux";
      break;
    case "win32":
      platform = "windows";
      break;
    default:
      platform = os.platform();
      break;
  }

  // Map architecture names
  let arch;
  switch (os.arch()) {
    case "x64":
      arch = "x64";
      break;
    case "arm64":
      arch = "arm64";
      break;
    case "arm":
      arch = "arm";
      break;
    default:
      arch = os.arch();
      break;
  }

  return { platform, arch };
}

function isMusl() {
  if (os.platform() !== "linux") {
    return false;
  }
  try {
    // Check for musl dynamic linker
    const files = fs.readdirSync("/lib");
    if (files.some((f) => f.startsWith("ld-musl-"))) {
      return true;
    }
    // Fallback: check ldd output
    const lddOutput = execSync("ldd --version 2>&1 || true", {
      encoding: "utf8",
    });
    return lddOutput.toLowerCase().includes("musl");
  } catch {
    return false;
  }
}

function findBinary() {
  const { platform, arch } = detectPlatformAndArch();
  const suffix = isMusl() ? "-musl" : "";
  const packageName = `${NPM_SCOPE}/ralph-${platform}-${arch}${suffix}`;
  const binaryName = platform === "windows" ? "ralph.exe" : "ralph";

  try {
    // Use require.resolve to find the package
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = path.dirname(packageJsonPath);
    const binaryPath = path.join(packageDir, "bin", binaryName);

    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found at ${binaryPath}`);
    }

    return { binaryPath, binaryName };
  } catch (error) {
    throw new Error(`Could not find package ${packageName}: ${error.message}`);
  }
}

function prepareBinDirectory(binaryName) {
  const binDir = path.join(__dirname, "bin");
  const targetPath = path.join(binDir, binaryName);

  // Ensure bin directory exists
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Remove existing binary/symlink if it exists
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

  return { binDir, targetPath };
}

function symlinkBinary(sourcePath, binaryName) {
  const { targetPath } = prepareBinDirectory(binaryName);

  fs.symlinkSync(sourcePath, targetPath);
  console.log(`ralph binary symlinked: ${targetPath} -> ${sourcePath}`);

  // Verify the file exists after operation
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Failed to symlink binary to ${targetPath}`);
  }
}

async function main() {
  try {
    if (os.platform() === "win32") {
      // On Windows, the .exe is already included in the package and bin field points to it
      // No postinstall setup needed
      console.log(
        "Windows detected: binary setup not needed (using packaged .exe)"
      );
      return;
    }

    const { binaryPath, binaryName } = findBinary();
    symlinkBinary(binaryPath, binaryName);
  } catch (error) {
    console.error("Failed to setup ralph binary:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Postinstall script error:", error.message);
  process.exit(1);
});
