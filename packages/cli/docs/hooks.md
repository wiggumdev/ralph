# Hooks

Ralph supports lifecycle hooks that execute shell commands at key points during the agent loop. Use hooks to integrate with external tools, send notifications, or run custom scripts.

## Configuration

Add hooks to your `ralph.json` config file:

```json
{
  "adapter": "claude",
  "maxIterations": 10,
  "hooks": {
    "ralph_start": "echo 'Starting Ralph'",
    "ralph_loop_start": "echo 'Iteration $RALPH_LOOP_ITERATION starting'",
    "ralph_loop_end": "echo 'Iteration $RALPH_LOOP_ITERATION complete'",
    "ralph_complete": "notify-send 'Ralph finished in $RALPH_TOTAL_ITERATIONS iterations'",
    "ralph_max_iterations": "echo 'Max iterations reached'"
  }
}
```

## Available Hooks

| Hook | When it runs |
|------|--------------|
| `ralph_start` | Once at the beginning of a Ralph run |
| `ralph_loop_start` | At the start of each iteration |
| `ralph_loop_end` | At the end of each iteration |
| `ralph_complete` | When the task completes successfully |
| `ralph_max_iterations` | When max iterations reached without completion |

## Environment Variables

Each hook receives context via environment variables.

### ralph_start

| Variable | Description |
|----------|-------------|
| `RALPH_CWD` | Working directory |
| `RALPH_TASKS_NOT_PASSING` | Number of failing tasks from PRD |
| `RALPH_MAX_ITERATIONS` | Maximum iterations configured |

### ralph_loop_start / ralph_loop_end

| Variable | Description |
|----------|-------------|
| `RALPH_CWD` | Working directory |
| `RALPH_LOOP_ITERATION` | Current iteration number (1-indexed) |

### ralph_complete / ralph_max_iterations

| Variable | Description |
|----------|-------------|
| `RALPH_CWD` | Working directory |
| `RALPH_TOTAL_ITERATIONS` | Total iterations executed |

## Examples

### Slack notification on completion

```json
{
  "hooks": {
    "ralph_complete": "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"Ralph completed in '$RALPH_TOTAL_ITERATIONS' iterations\"}' $SLACK_WEBHOOK_URL"
  }
}
```

### Log iterations to file

```json
{
  "hooks": {
    "ralph_loop_start": "echo \"$(date): Starting iteration $RALPH_LOOP_ITERATION\" >> ralph.log",
    "ralph_loop_end": "echo \"$(date): Finished iteration $RALPH_LOOP_ITERATION\" >> ralph.log"
  }
}
```

### Run tests after each iteration

```json
{
  "hooks": {
    "ralph_loop_end": "bun test --bail 2>/dev/null || true"
  }
}
```

### Desktop notification (macOS)

```json
{
  "hooks": {
    "ralph_complete": "osascript -e 'display notification \"Completed in $RALPH_TOTAL_ITERATIONS iterations\" with title \"Ralph\"'",
    "ralph_max_iterations": "osascript -e 'display notification \"Max iterations reached\" with title \"Ralph\" sound name \"Basso\"'"
  }
}
```

### Play sound on completion (macOS)

```json
{
  "hooks": {
    "ralph_complete": "afplay /System/Library/Sounds/Glass.aiff",
    "ralph_max_iterations": "afplay /System/Library/Sounds/Basso.aiff"
  }
}
```

## Notes

- Hooks run synchronously and block the loop until complete
- Hook failures (non-zero exit) are logged but don't stop Ralph
- Hooks inherit the parent process environment
- Commands run via `sh -c` in the configured working directory
- Use `verbose: true` in config to see hook execution logs
