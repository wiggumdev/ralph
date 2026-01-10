# Gemini CLI Adapter

This document describes the Gemini CLI adapter implementation and compares it with the Claude CLI adapter.

## Installation

Install Gemini CLI globally:

```bash
npm install -g @google/gemini-cli
```

## Configuration

Set `adapter: "gemini"` in your ralph config:

```toml
# ~/.ralph/config.toml or .ralph/config.toml
adapter = "gemini"
```

Or use the `--adapter` CLI flag:

```bash
ralph run --adapter gemini
```

## Feature Parity Matrix

| Feature | Claude CLI | Gemini CLI | Notes |
|---------|------------|------------|-------|
| Non-interactive mode | `--permission-mode acceptEdits` | `--approval-mode yolo` | Full parity |
| Prompt input | `-p <prompt>` | `-p <prompt>` | Full parity |
| Stream JSON output | `--output-format stream-json` | `--output-format stream-json` | Partial parity (see gaps) |
| Plain text output | Default | Default | Full parity |
| Debug/verbose mode | `--debug` | `--debug` | Full parity |
| Completion detection | Via completion marker in output | Via completion marker in output | Full parity |

## Functional Gaps

### 1. Stream JSON Format Differences

**Issue**: The stream-json output format structure differs between Claude CLI and Gemini CLI.

**Claude CLI stream-json events**:
- `system` - Session initialization with model, tools, cwd
- `assistant` - Messages with content blocks (text, tool_use)
- `user` - User messages with tool results
- `result` - Task completion status with cost/usage stats
- `content_block_delta` - Streaming text/tool input deltas

**Gemini CLI stream-json events**:
- `session_metadata` - Session info with sessionId, projectHash
- `user` - User messages
- `gemini` - Assistant messages (note: different key than "assistant")
- `message_update` - Updates to existing messages (tokens, etc.)

**Impact**: The current `StreamJsonParser` is optimized for Claude's format. Gemini's different event types (`gemini` vs `assistant`, `session_metadata` vs `system`) may not parse correctly for rich message display.

**Workaround**: Text mode works reliably. For stream-json mode, basic output streaming works but rich message rendering (tool use blocks, system info) may be incomplete.

### 2. Result/Completion Event Structure

**Issue**: Gemini CLI may not emit a `result` event with the same structure as Claude CLI.

**Claude CLI result event**:
```json
{
  "type": "result",
  "subtype": "success",
  "result": "...",
  "duration_ms": 1234,
  "total_cost_usd": 0.05,
  "usage": { "input_tokens": 100, "output_tokens": 50 }
}
```

**Impact**: Cost tracking and usage statistics may not be available with the Gemini adapter.

**Workaround**: Completion detection still works via the `<promise>COMPLETE</promise>` marker that ralph injects into the prompt.

### 3. Session ID Tracking

**Issue**: Session ID is extracted from different fields.

- Claude: `session_id` in `system` and other events
- Gemini: `sessionId` in `session_metadata` event

**Impact**: Session ID may not be captured correctly for logging purposes.

### 4. Tool Use/Result Rich Rendering

**Issue**: Gemini's tool call format in stream-json may differ from Claude's `tool_use` and `tool_result` content block types.

**Impact**: Rich tool use visualization in TUI mode may not work correctly.

### 5. Missing Features in Gemini CLI

The following Claude CLI features have no direct equivalent:

| Claude Feature | Gemini Status | Notes |
|----------------|---------------|-------|
| `--verbose` flag | Partial | Uses `--debug` instead |
| Cost tracking | Not available | Gemini doesn't report cost in stream-json |
| Session resume | Different | Gemini uses checkpointing (configured in settings.json) |

### 6. Additional Gemini CLI Features Not Used

Gemini CLI has features that the adapter doesn't currently expose:

| Gemini Feature | Description |
|----------------|-------------|
| `--model` | Select specific model (gemini-2.5-pro, gemini-3-flash, etc.) |
| `--sandbox` | Run in sandboxed Docker environment |
| `--include-directories` | Add additional directories to context |
| MCP server support | Custom tool integrations via settings.json |

## Recommendations

### For Reliable Operation

1. **Use text mode** for most reliable operation:
   ```toml
   adapter = "gemini"
   # TUI will use text output format
   ```

2. **Stream-json mode** works for basic streaming but rich features may be limited.

### Future Improvements

1. **Create GeminiStreamJsonParser**: Implement a parser specifically for Gemini's stream-json format to enable full rich message support.

2. **Add model selection**: Expose `--model` flag in adapter options to allow choosing between Gemini models.

3. **Add sandbox option**: Expose `--sandbox` flag for users who want additional security.

## Testing

To verify the adapter works:

1. Ensure Gemini CLI is installed: `gemini --version`
2. Configure authentication (first run of `gemini` will guide you)
3. Run ralph with gemini adapter:
   ```bash
   ralph run --adapter gemini
   ```

## References

- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI Documentation](https://geminicli.com/docs/)
- [Gemini CLI Configuration](https://geminicli.com/docs/get-started/configuration/)
- [Headless Mode Documentation](https://geminicli.com/docs/cli/headless/)
