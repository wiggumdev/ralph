# ralph

<p align="center">
  <img src="docs/public/favicon.svg" alt="ralph logo" width="80" height="80">
</p>

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
ralph run "Add tests for all untested modules"
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

# Or OpenCode, Aider, etc.
```

## Quick Start

```bash
# Initialize in your project
cd your-project
ralph init

# Run a task
ralph run "Fix all TypeScript errors in this project"

# Or with a prompt file
ralph run --prompt TASK.md
```

## Features

- **🔄 Context Reset** — Fresh context window each iteration
- **🧠 State Persistence** — Progress via git, files, and tests
- **🛑 Smart Exit** — Configurable completion conditions
- **🔧 Tool Agnostic** — Claude Code, OpenCode, Aider, or any CLI

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
4. ralph checks exit conditions
5. If not done, reset and loop

## Documentation

Full documentation at **[ralph.dev](https://ralph.dev)** (coming soon)

Or run locally:
```bash
cd docs
npm install
npm run dev
```

### Docs Contents

- **Getting Started** — Installation, quick start
- **Core Concepts** — The loop, context windows, exit conditions
- **Usage** — CLI reference, configuration, tool guides
- **Examples** — Refactors, testing, documentation, migrations

## Configuration

Create `ralph.config.json`:

```json
{
  "tool": "claude",
  "exitConditions": {
    "command": "npm test",
    "successExitCode": 0,
    "maxIterations": 50
  }
}
```

## Examples

### Add Test Coverage

```bash
ralph run "Add tests until coverage reaches 80%"
```

### Large Refactor

```bash
ralph run "Rename UserService to AccountService everywhere"
```

### Fix All Errors

```bash
ralph run "Fix all ESLint errors"
```

## Based On

- [The original Ralph concept](https://ghuntley.com/ralph/) by Geoffrey Huntley
- [Anthropic's research](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) on effective harnesses for long-running agents
- [Matt Pocock's explanation](https://youtu.be/_IK18goX4X8) of the technique

## License

MIT
