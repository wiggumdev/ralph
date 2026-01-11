# ralph

<h1 align="center">ralph</h1>

<p align="center">
  <strong>AI-agnostic agentic loop CLI</strong>
  <br>
  Reset context. Persist learnings. Ship code.
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#why-ralph">Why Ralph?</a>
</p>

---

## What is ralph?

**ralph** runs AI coding agents in iterative loops. Instead of one-shot prompts that hit context limits and get confused, ralph resets the context window between iterations while preserving learnings through your codebase.

```bash
ralph run
```

The AI works, exits, ralph checks if done, resets context, and loops—until your task is complete.

## Why "Ralph Wiggum"?

The technique was coined by [Geoffrey Huntley](https://ghuntley.com/ralph/):

> "Ralph is a Bash loop."

Named after Ralph Wiggum from The Simpsons—embodying the philosophy of persistent iteration despite setbacks. *"Me fail English? That's unpossible!"*

## Installation

```bash
npm install -g @wiggumdev/ralph
```

You'll also need an AI CLI tool:

```bash
# Claude Code (recommended)
npm install -g @anthropic-ai/claude-code

# Or OpenCode
go install github.com/opencode-ai/opencode@latest
```

### Supported Adapters

| Adapter | Status |
|---------|--------|
| Claude Code | Complete |
| OpenCode | Complete |
| Gemini CLI | Under Development |

## Quick Start

```bash
# Initialize in your project
cd your-project
ralph init

# Edit your prompt
nano .plans/PROMPT.md

# Run the loop
ralph run
```

## Features

- **Context Reset** — Fresh context window each iteration
- **State Persistence** — Progress via git, files, and tests
- **Completion Detection** — AI signals when done with `<promise>COMPLETE</promise>`
- **Lifecycle Hooks** — Run commands at key points in the loop

## How It Works

```
┌─────────────────────────────────────────────┐
│                                             │
│   Start ──▶ Run AI ──▶ Check ──▶ Done? ──┐ │
│     ▲                           │        │ │
│     └────── Reset ◀─── No ◀─────┘        │ │
│                                          │ │
│              Yes ──▶ Exit ◀──────────────┘ │
│                                             │
│   State persists via: git, files, tests    │
│                                             │
└─────────────────────────────────────────────┘
```

Each iteration:
1. AI starts with fresh context
2. Reads codebase to understand state
3. Does work (writes code, runs tests)
4. ralph checks for completion marker
5. If not done, reset and loop

## Configuration

ralph uses TOML config at `.ralph/config.toml`:

```toml
adapter = "claude"
maxIterations = 20
plansDir = ".plans"
verbose = false
tui = true

[hooks]
ralph_start = ""
ralph_loop_end = "npm run lint:fix"
ralph_complete = ""
```

## Project Structure

After `ralph init`:

```
project/
├── .ralph/
│   └── config.toml      # Configuration
└── .plans/
    ├── prd.json         # Feature requirements
    ├── PROMPT.md        # Your task prompt
    └── progress.txt     # Learning log
```

## Commands

```bash
ralph init              # Initialize ralph in a project
ralph run               # Start the agentic loop
ralph check             # Validate prd.json schema
```

### Run Options

```bash
ralph run --max-iterations 10   # Limit iterations
ralph run --once                # Single iteration (no loop)
ralph run --prompt TASK.md      # Use specific prompt file
ralph run --no-tui              # Plain text output (for CI)
ralph run --verbose             # Debug output
```

## Prompt Pattern

Your prompt in `.plans/PROMPT.md` should include:

```markdown
# Task
[What to do]

# Guidelines
[How to do it]

# Progress
Check progress.txt for completed work.

# Completion
When [condition is met], output:
<promise>COMPLETE</promise>
```

## Documentation

Full documentation at **[ralph.dev](https://wiggum.dev)** (coming soon)

Or run locally:
```bash
cd packages/docs
bun install
bun dev
```

## Development

```bash
# Build binary for current platform + symlink to ~/.local/bin/ralph-dev
cd packages/cli
bun run build --single

# Copy binary to ~/.local/bin/ralph (manual install)
bun run install-bin

# Remove both ralph and ralph-dev from ~/.local/bin
bun run unlink
```

## Based On

- [The original Ralph concept](https://ghuntley.com/ralph/) by Geoffrey Huntley
- [Anthropic's research](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) on effective harnesses for long-running agents
- [Matt Pocock's explanation](https://youtu.be/_IK18goX4X8) of the technique

## License

MIT
