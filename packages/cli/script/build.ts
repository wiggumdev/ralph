#!/usr/bin/env bun

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solidPlugin from "@opentui/solid/bun-plugin";
import { $ } from "bun";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, "..");

process.chdir(dir);

import pkg from "../package.json";

// Extract base name from scoped package (e.g., "@wiggumdev/ralph" -> "ralph")
const baseName = pkg.name.replace(/^@[^/]+\//, "");
// Extract scope if present (e.g., "@wiggumdev/ralph" -> "@wiggumdev")
const scope = pkg.name.startsWith("@") ? pkg.name.split("/")[0] : "";

const singleFlag = process.argv.includes("--single");
const baselineFlag = process.argv.includes("--baseline");
const skipInstall = process.argv.includes("--skip-install");

const allTargets: {
  os: string;
  arch: "arm64" | "x64";
  abi?: "musl";
  avx2?: false;
}[] = [
  {
    os: "linux",
    arch: "arm64",
  },
  {
    os: "linux",
    arch: "x64",
  },
  {
    os: "linux",
    arch: "x64",
    avx2: false,
  },
  {
    os: "linux",
    arch: "arm64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
    avx2: false,
  },
  {
    os: "darwin",
    arch: "arm64",
  },
  {
    os: "darwin",
    arch: "x64",
  },
  {
    os: "darwin",
    arch: "x64",
    avx2: false,
  },
  {
    os: "win32",
    arch: "x64",
  },
  {
    os: "win32",
    arch: "x64",
    avx2: false,
  },
];

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) {
        return false;
      }

      // When building for the current platform, prefer a single native binary by default.
      // Baseline binaries require additional Bun artifacts and can be flaky to download.
      if (item.avx2 === false) {
        return baselineFlag;
      }

      return true;
    })
  : allTargets;

await $`rm -rf dist`;

const binaries: Record<string, { version: string; scopedName: string }> = {};

if (!skipInstall) {
  await $`bun install --os="*" --cpu="*" @opentui/core@${pkg.dependencies["@opentui/core"]}`;
}

for (const item of targets) {
  // Directory name uses base name (no scope) for filesystem compatibility
  const dirName = [
    baseName,
    // changing to win32 flags npm for some reason
    item.os === "win32" ? "windows" : item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.abi === undefined ? undefined : item.abi,
  ]
    .filter(Boolean)
    .join("-");
  // Package name includes scope for npm publishing
  const name = scope ? `${scope}/${dirName}` : dirName;

  console.log(`building ${name}`);
  await $`mkdir -p dist/${dirName}/bin`;

  const binaryName = item.os === "win32" ? `${baseName}.exe` : baseName;
  const result = await Bun.build({
    target: "bun",
    tsconfig: "./tsconfig.json",
    plugins: [solidPlugin],
    sourcemap: "none",
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      // @ts-expect-error (bun types aren't up to date)
      autoloadTsconfig: true,
      autoloadPackageJson: true,
      target: dirName.replace(baseName, "bun") as any,
      outfile: `dist/${dirName}/bin/${binaryName}`,
      windows: {},
    },
    entrypoints: ["./src/index.ts"],
  });

  if (!result.success) {
    console.error(`Build failed for ${name}:`);
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  // Generate platform-specific package.json for npm publishing
  const platformPkg = {
    name,
    version: pkg.version,
    description: pkg.description,
    repository: pkg.repository,
    homepage: pkg.homepage,
    bugs: pkg.bugs,
    keywords: pkg.keywords,
    os: [item.os === "win32" ? "win32" : item.os],
    cpu: [item.arch],
    bin: {
      ralph: item.os === "win32" ? "./bin/ralph.exe" : "./bin/ralph",
    },
    publishConfig: {
      access: "public",
    },
  };
  await Bun.file(`dist/${dirName}/package.json`).write(
    JSON.stringify(platformPkg, null, 2)
  );

  // Track for optional dependencies (dirName -> { version, scopedName })
  binaries[dirName] = { version: pkg.version, scopedName: name };
}

// Auto-symlink ralph-dev to ~/.local/bin when building for current platform
if (singleFlag) {
  const binDir = path.join(os.homedir(), ".local", "bin");
  const symlinkPath = path.join(binDir, "ralph-dev");
  const platformDirName = [
    baseName,
    process.platform === "win32" ? "windows" : process.platform,
    process.arch,
  ].join("-");
  const binaryPath = path.resolve(dir, `dist/${platformDirName}/bin/ralph`);

  await fs.promises.mkdir(binDir, { recursive: true });
  await fs.promises.rm(symlinkPath, { force: true });
  await fs.promises.symlink(binaryPath, symlinkPath);
  console.log(`symlinked ${symlinkPath} -> ${binaryPath}`);
}

export { binaries };
