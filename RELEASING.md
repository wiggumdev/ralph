# Releasing Ralph

This document describes how to release new versions of Ralph.

## Overview

Ralph uses a multi-platform release strategy:

- **npm**: Platform-specific binary packages + meta package (`@wiggumdev/ralph`)
- **GitHub Releases**: Archives for direct download
- **Docker**: Multi-arch images on GitHub Container Registry

## Version Numbering

Ralph follows [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH` for stable releases (e.g., `1.0.0`)
- `MAJOR.MINOR.PATCH-preview.N` for preview releases (e.g., `1.0.0-preview.1`)

Supported prerelease suffixes:
- `-preview.N` - Preview/beta releases
- `-alpha.N` - Alpha releases
- `-beta.N` - Beta releases
- `-rc.N` - Release candidates
- `-canary.N` - Canary builds

## Quick Start

### Automated Release (Recommended)

1. **Update version:**
   ```bash
   cd packages/cli
   bun run script/version.ts 1.0.0        # Stable release
   bun run script/version.ts 1.0.0-preview.1  # Preview release
   ```

2. **Commit and tag:**
   ```bash
   git add packages/cli/package.json
   git commit -m "chore: release v1.0.0"
   git tag v1.0.0
   git push origin main --tags
   ```

3. **GitHub Actions handles the rest:**
   - Builds all platform binaries
   - Runs smoke tests
   - Publishes to npm
   - Pushes Docker images
   - Creates GitHub release

### Manual Release

For testing or debugging:

```bash
cd packages/cli

# Build all platforms
bun run script/publish.ts

# Dry run (see what would be published)
bun run script/publish.ts --dry-run

# Actually publish
bun run script/publish.ts --publish
```

## Scripts Reference

### `script/version.ts`

Manage package versions:

```bash
bun run script/version.ts              # Show current version
bun run script/version.ts 1.0.0        # Set specific version
bun run script/version.ts patch        # Bump patch (0.0.1 -> 0.0.2)
bun run script/version.ts minor        # Bump minor (0.0.1 -> 0.1.0)
bun run script/version.ts major        # Bump major (0.0.1 -> 1.0.0)
bun run script/version.ts preview      # Add/bump preview (0.1.0 -> 0.1.0-preview.1)
```

### `script/build.ts`

Build platform binaries:

```bash
bun run script/build.ts                # Build all 11 platform targets
bun run script/build.ts --single       # Build only current platform
bun run script/build.ts --baseline     # Include baseline (non-AVX2) variant
bun run script/build.ts --skip-install # Skip reinstalling dependencies
```

### `script/publish.ts`

Package and publish:

```bash
bun run script/publish.ts              # Build and package only
bun run script/publish.ts --publish    # Build, package, and publish to npm
bun run script/publish.ts --dry-run    # Show what would be published
bun run script/publish.ts --skip-build # Use existing dist/ (for re-publishing)
```

## Platform Targets

Ralph builds for these platforms:

| Platform | Architecture | Variant |
|----------|-------------|---------|
| Linux | x64 | glibc |
| Linux | x64 | glibc, baseline |
| Linux | x64 | musl |
| Linux | x64 | musl, baseline |
| Linux | arm64 | glibc |
| Linux | arm64 | musl |
| macOS | x64 | - |
| macOS | x64 | baseline |
| macOS | arm64 | - |
| Windows | x64 | - |
| Windows | x64 | baseline |

**Baseline variants** are for older CPUs without AVX2 support.

## npm Package Structure

The release creates these packages:

- `@wiggumdev/ralph` - Meta package (installs correct binary via optional deps)
- `ralph-linux-x64` - Linux x64 binary
- `ralph-linux-arm64` - Linux arm64 binary
- `ralph-darwin-x64` - macOS Intel binary
- `ralph-darwin-arm64` - macOS Apple Silicon binary
- `ralph-windows-x64` - Windows x64 binary
- (etc. for all variants)

Users install with:
```bash
npm install -g @wiggumdev/ralph
```

The postinstall script automatically selects the right binary for their platform.

## npm Tags

- `latest` - Stable releases (default)
- `preview` - Preview/prerelease versions

Install specific version:
```bash
npm install -g @wiggumdev/ralph@latest   # Latest stable
npm install -g @wiggumdev/ralph@preview  # Latest preview
npm install -g @wiggumdev/ralph@1.0.0    # Specific version
```

## Docker Images

Images are pushed to GitHub Container Registry:

```bash
# Latest stable
docker pull ghcr.io/wiggumdev/ralph:latest

# Specific version
docker pull ghcr.io/wiggumdev/ralph:1.0.0

# Preview
docker pull ghcr.io/wiggumdev/ralph:preview
```

Supported architectures: `linux/amd64`, `linux/arm64`

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and PR:
- Linting
- Type checking
- Tests
- Build verification (all platforms)

### Release Workflow (`.github/workflows/release.yml`)

Triggered by:
- Pushing a tag matching `v*`
- Manual workflow dispatch

Steps:
1. Build all platform binaries
2. Smoke test on native runners
3. Publish to npm
4. Push Docker images
5. Create GitHub release

## Required Secrets

Configure these in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `NPM_TOKEN` | npm automation token with publish access |
| `GITHUB_TOKEN` | (Automatic) Used for GitHub releases and GHCR |

### Creating an npm Token

1. Go to https://www.npmjs.com/settings/tokens
2. Click "Generate New Token" → "Classic Token"
3. Select "Automation" type
4. Add to GitHub: Settings → Secrets → Actions → New repository secret

## Troubleshooting

### Build fails on specific platform

Run build locally for that platform:
```bash
bun run script/build.ts  # Cross-compiles all platforms
```

### npm publish fails

Check:
- `NPM_TOKEN` secret is set correctly
- Token has publish permissions
- Package names don't conflict with existing packages

### Docker build fails

Ensure artifacts are in the correct location:
```
packages/cli/dist/ralph-linux-x64/bin/ralph
packages/cli/dist/ralph-linux-arm64/bin/ralph
```

### Smoke tests fail

Run locally:
```bash
cd packages/cli
bun run build --single
./dist/ralph-linux-x64/bin/ralph --version
```

## Release Checklist

- [ ] All tests passing on main branch
- [ ] Update version in `packages/cli/package.json`
- [ ] Update CHANGELOG if maintained
- [ ] Create and push tag
- [ ] Verify GitHub Actions workflow succeeds
- [ ] Verify npm packages are published
- [ ] Verify Docker images are pushed
- [ ] Verify GitHub release is created
- [ ] Test installation: `npm install -g @wiggumdev/ralph`
