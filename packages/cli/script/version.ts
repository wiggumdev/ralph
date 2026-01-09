#!/usr/bin/env bun
/**
 * Version management script for ralph CLI
 *
 * Usage:
 *   bun run script/version.ts <version>         # Set specific version
 *   bun run script/version.ts patch             # Bump patch (0.0.1 -> 0.0.2)
 *   bun run script/version.ts minor             # Bump minor (0.0.1 -> 0.1.0)
 *   bun run script/version.ts major             # Bump major (0.0.1 -> 1.0.0)
 *   bun run script/version.ts preview           # Add/bump preview suffix (0.1.0 -> 0.1.0-preview.1)
 *   bun run script/version.ts                   # Show current version
 *
 * Examples:
 *   bun run script/version.ts 1.0.0             # Release 1.0.0
 *   bun run script/version.ts 1.0.0-preview.1   # Preview release
 *   bun run script/version.ts preview           # Bump to next preview
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = fileURLToPath(new URL("..", import.meta.url));
const pkgPath = path.join(dir, "package.json");

const pkg = await Bun.file(pkgPath).json();
const currentVersion = pkg.version;

const arg = process.argv[2];

if (!arg) {
  console.log(`Current version: ${currentVersion}`);
  process.exit(0);
}

function parseVersion(v: string): { major: number; minor: number; patch: number; prerelease?: string } {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) throw new Error(`Invalid version: ${v}`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

function formatVersion(v: { major: number; minor: number; patch: number; prerelease?: string }): string {
  const base = `${v.major}.${v.minor}.${v.patch}`;
  return v.prerelease ? `${base}-${v.prerelease}` : base;
}

let newVersion: string;

switch (arg) {
  case "patch": {
    const v = parseVersion(currentVersion);
    v.patch++;
    v.prerelease = undefined;
    newVersion = formatVersion(v);
    break;
  }
  case "minor": {
    const v = parseVersion(currentVersion);
    v.minor++;
    v.patch = 0;
    v.prerelease = undefined;
    newVersion = formatVersion(v);
    break;
  }
  case "major": {
    const v = parseVersion(currentVersion);
    v.major++;
    v.minor = 0;
    v.patch = 0;
    v.prerelease = undefined;
    newVersion = formatVersion(v);
    break;
  }
  case "preview": {
    const v = parseVersion(currentVersion);
    if (v.prerelease?.startsWith("preview.")) {
      const num = parseInt(v.prerelease.split(".")[1], 10);
      v.prerelease = `preview.${num + 1}`;
    } else {
      // Strip any existing prerelease and add preview.1
      v.prerelease = "preview.1";
    }
    newVersion = formatVersion(v);
    break;
  }
  default: {
    // Assume it's a specific version string
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(arg)) {
      console.error(`Invalid version format: ${arg}`);
      console.error("Expected: X.Y.Z or X.Y.Z-suffix");
      process.exit(1);
    }
    newVersion = arg;
  }
}

pkg.version = newVersion;
await Bun.file(pkgPath).write(JSON.stringify(pkg, null, 2) + "\n");

console.log(`Version updated: ${currentVersion} -> ${newVersion}`);
