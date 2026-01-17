# Playback Fixtures

Test harness fixtures for UI development without a live ACP adapter.

## extract-fixtures.ts

Diagnostic script that parses verbose log files and outputs ACP message analysis to stdout. **Does not modify fixtures.ts** - use the output to manually create new fixtures.

### Usage

```bash
bun scripts/extract-fixtures.ts <log-files...>

# Examples
bun scripts/extract-fixtures.ts ~/Desktop/logs/*.log
bun scripts/extract-fixtures.ts ~/Desktop/logs/ralph-debug-123.log
```

### How It Works

1. **Parse logs** - Reads log files line by line, extracts JSON from lines matching `update={...} ACP IN`
2. **Group by type** - Groups messages by `sessionUpdate` field (e.g., `agent_message_chunk`, `tool_call`, `plan`)
3. **Output stats** - Shows counts, field names, and sample JSON for each message type
4. **Highlight patterns** - Reports tool call types, diff/terminal content, error counts

### Output Sections

| Section | Description |
|---------|-------------|
| Message Types | Count and field names per sessionUpdate type |
| Sample Messages | First JSON example of each type |
| Special Patterns | Tool breakdown, content types, error counts |
| Sample Diff | Example tool_call_update with diff content |
| Sample Tool Result | Example tool_call_update with output content |

### Log Format Expected

```
DEBUG 2026-01-16T14:45:59 +43ms service=acp update={"sessionUpdate":"agent_message_chunk",...} ACP IN
```

The script extracts the JSON object between `update=` and ` ACP IN`.

## fixtures.ts

Located at `src/test-harness/fixtures.ts`. Contains:

- **Sample messages** - Individual message examples (`SAMPLE_TEXT_MESSAGE`, `SAMPLE_PLAN_MESSAGE`, etc.)
- **Sample sessions** - Complete session states for static scenarios
- **Sequences** - Ordered message arrays for playback simulation

### Available Sequences

| Sequence | Description |
|----------|-------------|
| `simple_task` | Basic tool call flow |
| `tool_calls` | Read + Edit sequence |
| `streaming` | Word-by-word text deltas |
| `thinking` | Thinking blocks streaming before response |
| `markdown_content` | Rich markdown (headings, bold, tables, code) |
| `bash_tool` | Bash command execution |
| `edit_with_diff` | Edit tool with diff content |
| `todo_flow` | Plan progression (pending → in_progress → completed) |
| `parallel` | Multiple tool calls in one message |
| `tool_error` | Error + recovery flow |
| `nested_agent` | Task tool invocation |

### Adding New Fixtures

1. Run `extract-fixtures.ts` on logs containing the message type you need
2. Copy relevant JSON from the output
3. Add to `fixtures.ts`:
   - Create a `SAMPLE_*` constant for the message
   - Create a `SEQUENCE_*` array for the flow
   - Add to `SEQUENCES` export map
4. Update `dev.ts` to include the new sequence

### Example Workflow

```bash
# 1. Generate logs with verbose mode
RALPH_LOG_LEVEL=DEBUG bun start "create a todo list"

# 2. Analyze the logs
bun scripts/extract-fixtures.ts ~/Desktop/logs/ralph-debug-*.log

# 3. Copy samples from output, add to fixtures.ts

# 4. Test with playback
bun dev
```

## dev.ts

Configures `PlaybackEngine` to cycle through sequences:

```typescript
const provider = new PlaybackEngine({
  iterations: [
    SEQUENCE_STREAMING,
    SEQUENCE_BASH_TOOL,
    // ...
  ],
  speed: 1.0,      // Playback speed multiplier
  baseDelay: 300,  // ms between messages
});
```

Run with `bun dev` to visually test UI rendering of all sequences.
