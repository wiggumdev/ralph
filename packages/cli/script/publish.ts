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
console.log(`   publish: ${publishFlag ? "yes" : "no (use --publish to publish)"}`);
console.log("");

// Build all platform binaries
if (!skipBuild) {
  console.log("🔨 Building all platforms...\n");
  const { binaries } = await import("./build.ts");
  globalThis.__binaries = binaries;
} else {
  // Read binaries from existing dist directory
  const fs = await import("node:fs");
  const distDirs = fs.readdirSync("dist").filter((d) => d.startsWith("ralph-"));
  const binaries: Record<string, string> = {};
  for (const dir of distDirs) {
    binaries[dir] = version;
  }
  globalThis.__binaries = binaries;
}

const binaries = globalThis.__binaries as Record<string, string>;

// Smoke test: run the binary for current platform
{
  const platformMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  };
  const platform = platformMap[process.platform] || process.platform;
  const name = `${pkg.name}-${platform}-${process.arch}`;

  if (binaries[name]) {
    console.log(`\n🧪 Smoke test: ${name}`);
    try {
      await $`./dist/${name}/bin/ralph --version`;
      console.log("   ✓ Smoke test passed\n");
    } catch {
      console.error("   ✗ Smoke test failed\n");
      process.exit(1);
    }
  }
}

// Create meta package
console.log("📋 Creating meta package...");
await $`mkdir -p ./dist/${pkg.name}`;
await $`cp -r ./bin ./dist/${pkg.name}/bin`;
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`;

const metaPkg = {
  name: `${pkg.name}-ai`,
  version: version,
  description: "AI-agnostic agentic loop CLI",
  bin: {
    [pkg.name]: `./bin/${pkg.name}`,
  },
  scripts: {
    postinstall: "node ./postinstall.mjs",
  },
  optionalDependencies: binaries,
  repository: {
    type: "git",
    url: "git+https://github.com/wiggumdev/ralph.git",
  },
  license: "MIT",
  engines: {
    node: ">=18",
  },
};

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(metaPkg, null, 2)
);
console.log(`   ✓ Created ${pkg.name}-ai meta package\n`);

// Pack all platform packages
console.log("📦 Packing platform packages...");
const packTasks = Object.keys(binaries).map(async (name) => {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${name}`);
  }
  await $`bun pm pack`.cwd(`./dist/${name}`).quiet();
  console.log(`   ✓ Packed ${name}`);
});
await Promise.all(packTasks);

// Pack meta package
await $`bun pm pack`.cwd(`./dist/${pkg.name}`).quiet();
console.log(`   ✓ Packed ${pkg.name}-ai\n`);

// Create archives for GitHub releases
console.log("📁 Creating release archives...");
for (const name of Object.keys(binaries)) {
  if (name.includes("linux")) {
    await $`tar -czf ../../${name}.tar.gz *`.cwd(`dist/${name}/bin`);
    console.log(`   ✓ ${name}.tar.gz`);
  } else {
    await $`zip -rq ../../${name}.zip *`.cwd(`dist/${name}/bin`);
    console.log(`   ✓ ${name}.zip`);
  }
}
console.log("");

// Publish to npm
if (publishFlag && !dryRunFlag) {
  console.log(`🚀 Publishing to npm with tag "${npmTag}"...\n`);

  // Publish platform packages first
  for (const name of Object.keys(binaries)) {
    console.log(`   Publishing ${name}...`);
    await $`npm publish *.tgz --access public --tag ${npmTag}`.cwd(`./dist/${name}`);
    console.log(`   ✓ Published ${name}`);
  }

  // Publish meta package
  console.log(`   Publishing ${pkg.name}-ai...`);
  await $`npm publish *.tgz --access public --tag ${npmTag}`.cwd(`./dist/${pkg.name}`);
  console.log(`   ✓ Published ${pkg.name}-ai\n`);

  console.log(`✅ Successfully published ralph v${version} to npm!`);
  console.log(`   Install with: npm install -g ${pkg.name}-ai@${npmTag}\n`);
} else if (dryRunFlag) {
  console.log("🔍 Dry run - would publish:");
  for (const name of Object.keys(binaries)) {
    console.log(`   npm publish dist/${name}/*.tgz --access public --tag ${npmTag}`);
  }
  console.log(`   npm publish dist/${pkg.name}/*.tgz --access public --tag ${npmTag}\n`);
} else {
  console.log("📝 Packages ready for publishing.");
  console.log(`   Run with --publish flag to publish to npm.\n`);
}

// Summary of created artifacts
console.log("📄 Created artifacts:");
console.log(`   dist/*.tar.gz, dist/*.zip  - GitHub release archives`);
console.log(`   dist/*/*.tgz               - npm packages\n`);

export { binaries };
