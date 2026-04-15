# TUI Testing Harness

Dev-only tool for rendering the TUI with static/sample data without needing live LLM adapters.

## Usage

```bash
# Static scenarios
bun run harness --scenario running bun run harness --scenario complete
bun run harness --scenario error
bun run harness --scenario idle

# Animated playback
bun run harness --playback tool_calls --speed 2.0
bun run harness --playback simple_task

# Options
bun run harness --help
```

## Options

| Option | Description |
|--------|-------------|
| `--scenario` | Static scenario: `idle`, `running`, `complete`, `error` |
| `--playback` | Playback sequence: `simple_task`, `tool_calls` |
| `--speed` | Playback speed multiplier (default: 1.0) |
| `--iterations` | Max iterations to display (default: 10) |
| `--no-usage` | Hide usage statistics |

## Architecture

| File | Purpose |
|------|---------|
| `src/providers/state.ts` | `AppState` interface, `StateProvider` abstraction, `StaticStateProvider` class |
| `src/ui/test-harness/fixtures.ts` | Sample messages, scenarios, playback sequences, helper functions |
| `src/ui/test-harness/playback.ts` | `PlaybackEngine` for animated message streaming |
| `src/ui/test-harness/harness-app.tsx` | `TestHarness` component that renders TUI with injected state |

Entry point: `src/harness.ts` (separate from main CLI, not bundled in production)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `q` / `Esc` | Quit |
| `e` / `Space` | Toggle expanded view |

## Adding Fixtures

Edit `src/ui/test-harness/fixtures.ts`:

```typescript
// Add sample messages
export const MY_MESSAGE: Message = {
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: "Hello" }],
  timestamp: Date.now(),
};

// Add scenarios to SCENARIOS map
export const SCENARIO_MY_STATE: AppState = {
  messages: [MY_MESSAGE],
  status: "running",
  iteration: 1,
  // ...
};

// Register in SCENARIOS
export const SCENARIOS = {
  // ...existing
  my_state: SCENARIO_MY_STATE,
} as const;
```

## Using in Tests

```typescript
import { StaticStateProvider } from "#providers/state";
import { SCENARIO_RUNNING } from "./ui/test-harness/fixtures";

const provider = new StaticStateProvider(SCENARIO_RUNNING);
const state = provider.getInitialState();
// Assert against state.messages, state.status, etc.
```
