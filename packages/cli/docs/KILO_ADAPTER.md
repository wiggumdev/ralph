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
| JSON Output | `--json` | Structured batch output for rich TUI display |
| Timeout | `--timeout N` | Timeout in seconds (future enhancement) |

## Output Formats

The Kilo adapter supports two output formats:

### batch-json (Recommended)
Uses `--json` flag to get structured JSON output. Provides:
- Rich message display with tool use visualization
- Structured content blocks (text, tool_use, tool_result)
- Session metadata and result tracking

**Limitation**: Output arrives at task completion, not streamed in real-time.

### text
Plain text output. Simpler but no structured message display.

## Feature Parity Analysis

### Comparison Matrix

| Feature | Claude | OpenCode | Kilo | Notes |
|---------|--------|----------|------|-------|
| **Output Formats** |
| Stream JSON | ✅ | ❌ | ❌ | Claude has native streaming JSON |
| Batch JSON | ❌ | ❌ | ✅ | Kilo `--json` outputs structured data |
| Plain Text | ✅ | ✅ | ✅ | All adapters support text output |
| **TUI Integration** |
| Rich Messages | ✅ | ❌ | ✅ | Kilo via batch-json, Claude via stream-json |
| Tool Display | ✅ | ❌ | ✅ | Structured tool use visualization |
| Real-time Streaming | ✅ | ❌ | ❌ | Only Claude streams incrementally |
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

#### 1. Real-time Streaming (Gap: Kilo)

**Impact: Medium**

The Claude adapter leverages `stream-json` output format to provide real-time TUI features:
- Incremental message streaming as Claude generates output
- Live tool input construction display
- Immediate feedback during execution

Kilo's `--json` flag provides batch JSON output. With `batch-json` format:
- Rich messages display **after** task completion, not during
- Tool use visualization available but not real-time
- Full structured content blocks supported

**Note:** The `batch-json` format now provides rich TUI display (messages, tools, results). The only gap is real-time streaming during execution.

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

1. **Streaming JSON Support**: If Kilo adds streaming JSON output in the future, the adapter can be updated to provide real-time TUI updates similar to Claude.

2. **Mode Selection CLI Flag**: Add `--kilo-mode` option to Ralph for selecting Kilo's agent modes (architect, ask, debug).

3. **Parallel Iteration Support**: Explore using Kilo's `--parallel` mode for concurrent development tasks.

4. **Timeout Configuration**: Expose Kilo's `--timeout` flag through Ralph's configuration.

5. **JSON Schema Refinement**: As Kilo's JSON output format becomes better documented, refine the `KiloJsonParser` for optimal compatibility.

## References

- [Kilo Code CLI Documentation](https://kilo.ai/docs/cli)
- [Kilo Code GitHub](https://github.com/Kilo-Org/kilocode)
- [NPM Package](https://www.npmjs.com/package/@kilocode/cli)
