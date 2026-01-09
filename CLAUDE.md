# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install       # install deps
bun dev           # run with watch mode
bun run --watch src/index.tsx  # explicit dev command
```

## Architecture

Terminal UI app using OpenTUI + SolidJS + Bun runtime.

**Stack:**
- OpenTUI (`@opentui/core`, `@opentui/solid`) - terminal UI framework
- SolidJS - reactive UI library
- Bun - runtime & bundler
- TypeScript with strict mode

**Entry:** `src/index.tsx` - renders TUI components via `render()` from `@opentui/solid`

**Key config:**
- `bunfig.toml` - preloads `@opentui/solid/preload` for JSX transform
- `tsconfig.json` - JSX import source set to `@opentui/solid`

## OpenTUI Components

Available primitives: `<box>`, `<text>`, `<ascii_font>`

Layout uses flexbox props: `alignItems`, `justifyContent`, `flexGrow`

Text styling via `TextAttributes` enum from `@opentui/core`
