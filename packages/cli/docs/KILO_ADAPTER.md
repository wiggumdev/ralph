# Kilo Code CLI Adapter

This document describes the Kilo Code CLI adapter for Ralph and provides a feature parity analysis compared to the Claude adapter.

## Installation

Install the Kilo Code CLI globally:

```bash
npm install -g @kilocode/cli
```

Both `kilocode` and `kilo` commands will be available after installation.

## Configuration

Select the Kilo adapter during `ralph init` or set it manually in `.ralph/config.toml`:

```toml
adapter = "kilo"
```

## Kilo CLI Features Used

| Feature | CLI Flag | Description |
|---------|----------|-------------|
| Autonomous Mode | `--auto` | Non-interactive execution with auto-approval |
| Mode Selection | `--mode code` | Uses "code" mode for development tasks |
| JSON Output | `--json` | Structured output (not currently used) |
| Timeout | `--timeout N` | Timeout in seconds (future enhancement) |

## Feature Parity Analysis

### Comparison Matrix

| Feature | Claude | OpenCode | Kilo | Notes |
|---------|--------|----------|------|-------|
| **Output Formats** |
| Stream JSON | ✅ | ❌ | ❌ | Claude has native streaming JSON |
| Plain Text | ✅ | ✅ | ✅ | All adapters support text output |
| Batch JSON | ❌ | ❌ | ✅ | Kilo supports `--json` for batch output |
| **TUI Integration** |
| Rich Messages | ✅ | ❌ | ❌ | Requires stream-json format |
| Tool Display | ✅ | ❌ | ❌ | Structured tool use visualization |
| Progress Tracking | ✅ | ✅ | ✅ | Basic progress works for all |
| **Permissions** |
| Auto-accept Edits | ✅ | ✅ | ✅ | Claude: `--permission-mode`, Kilo: `--auto` |
| Granular Control | ❌ | ❌ | ✅ | Kilo has per-operation approval config |
| **Session Management** |
| Session ID Tracking | ✅ | ❌ | ❌ | Claude provides session IDs in stream-json |
| Session Resume | ✅ | ❌ | ⚠️ | Kilo has `--continue` for last session |
| **Agent Modes** |
| Mode Selection | ❌ | ❌ | ✅ | Kilo: code, architect, ask, debug |
| Custom Modes | ❌ | ❌ | ✅ | Kilo supports user-defined modes |
| **Execution** |
| Parallel Instances | ❌ | ❌ | ✅ | Kilo `--parallel` uses git worktrees |
| Timeout Control | ❌ | ❌ | ✅ | Kilo `--timeout` flag |

### Feature Gap Details

#### 1. Rich TUI Experience (Gap: Kilo)

**Impact: Medium**

The Claude adapter leverages `stream-json` output format to provide rich TUI features:
- Real-time message streaming with structured content blocks
- Tool use visualization with input/output display
- Session metadata and result tracking

Kilo's `--json` flag provides batch JSON output, not streaming. This means:
- TUI displays plain text output instead of structured messages
- No real-time tool use visualization
- Less detailed progress information

**Workaround:** The text parser still captures output and displays it in the TUI, just without the rich formatting.

#### 2. Session ID Tracking (Gap: Kilo)

**Impact: Low**

Claude's stream-json format includes session IDs that Ralph uses for:
- Logging and debugging
- Potential session resume (future feature)

Kilo doesn't expose session IDs in the same way, though it does support `--continue` for resuming the last conversation.

**Workaround:** Session IDs are optional in Ralph's architecture and don't affect core functionality.

#### 3. Agent Modes (Gap: Claude)

**Impact: Medium-Low**

Kilo offers multiple agent modes:
- `code` - General development tasks (default for Ralph)
- `architect` - High-level planning and design
- `ask` - Q&A and explanations
- `debug` - Debugging assistance
- Custom modes via `.kilocode/modes/`

Claude doesn't have equivalent mode switching. This is an area where Kilo could potentially offer enhanced workflows.

**Future Enhancement:** The `KiloAdapterOptions` interface is prepared for mode selection:
```typescript
interface KiloAdapterOptions extends AdapterOptions {
  mode?: "code" | "architect" | "ask" | "debug" | string;
}
```

#### 4. Parallel Execution (Gap: Claude/OpenCode)

**Impact: Low**

Kilo's `--parallel` flag enables multiple instances to work simultaneously using git worktrees. This could theoretically allow Ralph to spawn multiple iterations in parallel.

Not currently implemented but could be a future enhancement.

#### 5. Granular Permission Control (Gap: Claude)

**Impact: Low**

Kilo's `~/.kilocode/cli/config.json` allows fine-grained auto-approval settings:
- `autoApproval.read` - File read operations
- `autoApproval.write` - File write operations
- `autoApproval.execute` - Command execution
- `autoApproval.browser` - Browser automation
- etc.

Claude uses `--permission-mode acceptEdits` which is simpler but less granular.

## Completion Detection

All adapters use the same completion marker injected via the prompt:

```
<promise>COMPLETE</promise>
```

This ensures consistent behavior across adapters for Ralph's iteration loop.

## Recommendations

### For Best TUI Experience
Use the **Claude adapter** for the richest TUI experience with real-time structured output.

### For Model Flexibility
Use the **Kilo adapter** if you need to switch between different LLM providers (OpenAI, Anthropic, Google, Mistral, self-hosted).

### For Simple Workflows
Any adapter works well for basic iterative development workflows.

## Future Improvements

1. **Streaming JSON Parser for Kilo**: If Kilo adds streaming JSON output, the adapter can be updated to support it.

2. **Mode Selection CLI Flag**: Add `--kilo-mode` option to Ralph for selecting Kilo's agent modes.

3. **Parallel Iteration Support**: Explore using Kilo's `--parallel` mode for concurrent development tasks.

4. **Timeout Configuration**: Expose Kilo's `--timeout` flag through Ralph's configuration.

## References

- [Kilo Code CLI Documentation](https://kilo.ai/docs/cli)
- [Kilo Code GitHub](https://github.com/Kilo-Org/kilocode)
- [NPM Package](https://www.npmjs.com/package/@kilocode/cli)
