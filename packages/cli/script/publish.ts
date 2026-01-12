#!/usr/bin/env bun
/**
 * Publish script for ralph CLI
 *
 * This script handles:
 * 1. Building all platform binaries (via build.ts)
 * 2. Smoke testing the current platform binary
 * 3. Creating npm packages for each platform + meta package
 * 4. Creating archives for GitHub releases
 * 5. Publishing to npm (when --publish flag is provided)
 *
 * Usage:
 *   bun run script/publish.ts              # Build and package only
 *   bun run script/publish.ts --publish    # Build, package, and publish to npm
 *   bun run script/publish.ts --dry-run    # Show what would be published
 *
 * Version handling:
 *   - Reads version from package.json
 *   - Preview versions (containing -preview, -alpha, -beta, -rc) get "preview" npm tag
 *   - Stable versions get "latest" npm tag
 */
import { fileURLToPath } from "node:url";
import { $ } from "bun";
import pkg from "../package.json";

// Extract base name from scoped package (e.g., "@wiggumdev/ralph" -> "ralph")
const baseName = pkg.name.replace(/^@[^/]+\//, "");
// Extract scope if present (e.g., "@wiggumdev/ralph" -> "@wiggumdev")
const scope = pkg.name.startsWith("@") ? pkg.name.split("/")[0] : "";

const dir = fileURLToPath(new URL("..", import.meta.url));
process.chdir(dir);

const publishFlag = process.argv.includes("--publish");
const dryRunFlag = process.argv.includes("--dry-run");
const skipBuild = process.argv.includes("--skip-build");

// Determine npm tag based on version
function getNpmTag(version: string): string {
  const previewPatterns = ["-preview", "-alpha", "-beta", "-rc", "-canary"];
  if (previewPatterns.some((p) => version.includes(p))) {
    return "preview";
  }
  return "latest";
}

const version = pkg.version;
const npmTag = getNpmTag(version);

console.log(`\n📦 Publishing ralph v${version}`);
console.log(`   npm tag: ${npmTag}`);
console.log(
  `   publish: ${publishFlag ? "yes" : "no (use --publish to publish)"}`
);
console.log("");

// Build all platform binaries
// binaries maps dirName -> { version, scopedName }
interface BinaryInfo {
  version: string;
  scopedName: string;
}
let binaries: Record<string, BinaryInfo>;

if (skipBuild) {
  // Read binaries from existing dist directory
  const fs = await import("node:fs");
  const distDirs = fs
    .readdirSync("dist")
    .filter((d) => d.startsWith(`${baseName}-`));
  binaries = {};
  for (const dirName of distDirs) {
    const scopedName = scope ? `${scope}/${dirName}` : dirName;
    binaries[dirName] = { version, scopedName };
  }
} else {
  console.log("🔨 Building all platforms...\n");
  const buildModule = await import("./build.ts");
  binaries = buildModule.binaries;
}

// Smoke test: run the binary for current platform
{
  const platformMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  };
  const platform = platformMap[process.platform] || process.platform;
  const dirName = `${baseName}-${platform}-${process.arch}`;

  if (binaries[dirName]) {
    console.log(`\n🧪 Smoke test: ${dirName}`);
    try {
      await $`./dist/${dirName}/bin/ralph --version`;
      console.log("   ✓ Smoke test passed\n");
    } catch {
      console.error("   ✗ Smoke test failed\n");
      process.exit(1);
    }
  }
}

// Create meta package
console.log("📋 Creating meta package...");
const metaDirName = baseName;
await $`mkdir -p ./dist/${metaDirName}`;
await $`cp -r ./bin ./dist/${metaDirName}/bin`;
await $`cp ./script/postinstall.mjs ./dist/${metaDirName}/postinstall.mjs`;

// Add .npmignore to exclude any stale artifacts
await Bun.file(`./dist/${metaDirName}/.npmignore`).write(`*.tgz
*.tar.gz
*.zip
`);

// Build optionalDependencies with scoped package names
const optionalDeps: Record<string, string> = {};
for (const [, info] of Object.entries(binaries)) {
  optionalDeps[info.scopedName] = info.version;
}

const metaPkgName = scope ? `${scope}/${baseName}` : baseName;
const metaPkg = {
  name: metaPkgName,
  version,
  description: "AI-agnostic agentic loop CLI",
  bin: {
    [baseName]: `./bin/${baseName}`,
  },
  scripts: {
    postinstall: "node ./postinstall.mjs",
  },
  optionalDependencies: optionalDeps,
  publishConfig: {
    access: "public",
  },
  repository: {
    type: "git",
    url: "git+https://github.com/wiggumdev/ralph.git",
  },
  license: "MIT",
  engines: {
    node: ">=18",
  },
};

await Bun.file(`./dist/${metaDirName}/package.json`).write(
  JSON.stringify(metaPkg, null, 2)
);
console.log(`   ✓ Created ${metaPkgName} meta package\n`);

// Pack all platform packages
console.log("📦 Packing platform packages...");
const packTasks = Object.entries(binaries).map(async ([dirName, info]) => {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${dirName}`);
  }
  await $`bun pm pack`.cwd(`./dist/${dirName}`).quiet();
  console.log(`   ✓ Packed ${info.scopedName}`);
});
await Promise.all(packTasks);

// Pack meta package
await $`bun pm pack`.cwd(`./dist/${metaDirName}`).quiet();
console.log(`   ✓ Packed ${metaPkgName}\n`);

// Create archives for GitHub releases
console.log("📁 Creating release archives...");
for (const dirName of Object.keys(binaries)) {
  if (dirName.includes("linux")) {
    await $`tar -czf ../../${dirName}.tar.gz *`.cwd(`dist/${dirName}/bin`);
    console.log(`   ✓ ${dirName}.tar.gz`);
  } else {
    await $`zip -rq ../../${dirName}.zip *`.cwd(`dist/${dirName}/bin`);
    console.log(`   ✓ ${dirName}.zip`);
  }
}
console.log("");

// Publish to npm
if (publishFlag && !dryRunFlag) {
  console.log(`🚀 Publishing to npm with tag "${npmTag}"...\n`);

  // Publish platform packages first
  for (const [dirName, info] of Object.entries(binaries)) {
    console.log(`   Publishing ${info.scopedName}...`);
    await $`bun publish *.tgz --access public --tag ${npmTag}`.cwd(
      `./dist/${dirName}`
    );
    console.log(`   ✓ Published ${info.scopedName}`);
  }

  // Publish meta package
  console.log(`   Publishing ${metaPkgName}...`);
  await $`bun publish *.tgz --access public --tag ${npmTag}`.cwd(
    `./dist/${metaDirName}`
  );
  console.log(`   ✓ Published ${metaPkgName}\n`);

  console.log(`✅ Successfully published ${baseName} v${version} to npm!`);
  console.log(`   Install with: npm install -g ${metaPkgName}@${npmTag}\n`);
} else if (dryRunFlag) {
  console.log("🔍 Dry run - would publish:");
  for (const [dirName, info] of Object.entries(binaries)) {
    console.log(
      `   bun publish dist/${dirName}/*.tgz --access public --tag ${npmTag} (${info.scopedName})`
    );
  }
  console.log(
    `   bun publish dist/${metaDirName}/*.tgz --access public --tag ${npmTag} (${metaPkgName})\n`
  );
} else {
  console.log("📝 Packages ready for publishing.");
  console.log("   Run with --publish flag to publish to npm.\n");
}

// Summary of created artifacts
console.log("📄 Created artifacts:");
console.log("   dist/*.tar.gz, dist/*.zip  - GitHub release archives");
console.log("   dist/*/*.tgz               - npm packages\n");

export { binaries };
