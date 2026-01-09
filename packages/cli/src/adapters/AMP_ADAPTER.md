# Amp CLI Adapter

This document describes the Amp CLI adapter implementation and feature parity analysis compared to the Claude CLI adapter.

## Overview

The Amp CLI adapter enables Ralph to use [Sourcegraph Amp](https://ampcode.com) as the underlying AI coding agent. Amp supports **Claude Code compatible stream-json output format**, which means the existing stream-json parser works seamlessly with Amp output.

## Installation

Amp CLI can be installed via npm/pnpm/yarn:

```bash
pnpm add -g @sourcegraph/amp
npm install -g @sourcegraph/amp
yarn global add @sourcegraph/amp
```

**Requirements:** Node.js v22 or higher

## Configuration

To use the Amp adapter, set it in your Ralph config:

```toml
# ~/.ralph/config.toml or .ralph/config.toml
adapter = "amp"
```

Or use it directly with the CLI:

```bash
ralph run --adapter amp "your prompt here"
```

## Feature Parity Analysis

### Full Parity Features

| Feature | Claude CLI | Amp CLI | Status |
|---------|-----------|---------|--------|
| Stream JSON output | `--output-format stream-json` | `--stream-json` | ✅ Full parity |
| Tool use blocks | Supported | Supported | ✅ Full parity |
| Tool result blocks | Supported | Supported | ✅ Full parity |
| Text deltas (streaming) | Supported | Supported | ✅ Full parity |
| Message parsing | StreamJsonParser | StreamJsonParser | ✅ Full parity |
| Verbose/Debug mode | `--verbose` / `--debug` | `--log-level debug` | ✅ Full parity |
| Non-interactive mode | `-p <prompt>` | `--execute <prompt>` | ✅ Full parity |

### Partial Parity Features

| Feature | Claude CLI | Amp CLI | Notes |
|---------|-----------|---------|-------|
| Permission mode | `--permission-mode acceptEdits` | `--dangerously-allow-all` | Different API, same effect |
| Session/Thread ID | `session_id` field | `session_id` field (via thread) | Amp uses "threads" terminology |

### Amp-Specific Features (Not in Claude)

| Feature | Description |
|---------|-------------|
| **Thread Management** | `amp threads new/continue/fork/list/share/compact` |
| **Subagents** | Librarian (codebase analysis), Oracle (expert advice), Smart (primary coding) |
| **Thread Visibility** | `--visibility private/public/workspace/group` |
| **MCP Servers** | Built-in MCP server management via `amp mcp` commands |
| **Custom Toolboxes** | User-defined tools via `AMP_TOOLBOX` directory |
| **Command Allowlisting** | Per-project CLI command security rules |
| **Sound Notifications** | `--notifications` / `--no-notifications` |

### Claude-Specific Features (Not in Amp)

| Feature | Description |
|---------|-------------|
| **Permission Modes** | Fine-grained permission control (`acceptEdits`, etc.) |
| **Resume Sessions** | `--resume <session_id>` flag for session continuation |

## Functional Gaps

### 1. Thread/Session Management

**Gap:** Ralph's iteration loop uses `sessionId` from Claude's stream-json output for session continuity. Amp uses "threads" with different management commands.

**Impact:** Session persistence between iterations may work via stream-json `session_id` field, but dedicated thread management features are not exposed.

**Workaround:** Amp's `--stream-json` output includes `session_id` in result messages, so basic session tracking works.

### 2. Permission Model

**Gap:** Claude uses `--permission-mode acceptEdits` for controlled permission bypass. Amp uses `--dangerously-allow-all` which bypasses all prompts.

**Impact:** Less granular control in Amp adapter. For production use, consider configuring `amp permissions` instead.

**Workaround:** Configure Amp's permission rules via `amp permissions add` for more controlled access.

### 3. Session Resume

**Gap:** Claude supports `--resume <session_id>` to continue a previous session. Amp uses thread commands (`amp threads continue`).

**Impact:** Ralph's session resume functionality may not work identically with Amp.

**Workaround:** Use Amp's thread management commands directly for session continuation.

## TUI Compatibility

The Amp adapter is fully compatible with Ralph's TUI (Terminal User Interface) because:

1. **Stream JSON Format:** Amp's `--stream-json` output is Claude Code compatible
2. **Message Types:** All message types (tool use, tool result, text delta, etc.) parse correctly
3. **Rich Display:** Tool invocations, results, and streaming text display properly
4. **Progress Tracking:** Session ID and completion status are extracted from result messages

## CLI Arguments Mapping

| Ralph Option | Claude Args | Amp Args |
|--------------|-------------|----------|
| Base command | `claude` | `amp --execute` |
| Permission bypass | `--permission-mode acceptEdits` | `--dangerously-allow-all` |
| Stream JSON | `--output-format stream-json --verbose` | `--stream-json` |
| Verbose | `--debug` | `--log-level debug` |
| Prompt | `-p <prompt>` | `<prompt>` (positional) |
| Notifications | N/A | `--no-notifications` |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `AMP_API_KEY` | Authentication token |
| `AMP_URL` | Override server endpoint |
| `AMP_LOG_LEVEL` | Set logging verbosity |
| `AMP_SETTINGS_FILE` | Custom settings location |

## References

- [Amp Official Site](https://ampcode.com)
- [Amp Owner's Manual](https://ampcode.com/manual)
- [Amp CLI npm package](https://www.npmjs.com/package/@sourcegraph/amp)
- [Streaming JSON announcement](https://ampcode.com/news/streaming-json)
