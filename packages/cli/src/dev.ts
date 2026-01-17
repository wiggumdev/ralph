#!/usr/bin/env bun

/**
 * Dev entrypoint for TUI development.
 * Uses PlaybackEngine with fixture data for testing UI without live adapter.
 *
 * Run with: bun run src/dev.ts
 */

import { PlaybackEngine } from "#providers/state/playback";
import { main } from "#ui/app";
import {
  SAMPLE_PERMISSION_REQUESTS,
  SEQUENCE_BASH_TOOL,
  SEQUENCE_EDIT_WITH_DIFF,
  SEQUENCE_MARKDOWN_CONTENT,
  SEQUENCE_NESTED_AGENT,
  SEQUENCE_PARALLEL,
  SEQUENCE_STREAMING,
  SEQUENCE_THINKING,
  SEQUENCE_TODO_FLOW,
  SEQUENCE_TOOL_CALLS,
  SEQUENCE_TOOL_ERROR,
} from "./test-harness/fixtures";

const showPermissions = process.argv.includes("--permissions");

const provider = new PlaybackEngine({
  iterations: [
    SEQUENCE_STREAMING, // Iteration 1: Word-by-word streaming
    SEQUENCE_THINKING, // Iteration 2: Thinking blocks
    SEQUENCE_MARKDOWN_CONTENT, // Iteration 3: Rich markdown
    SEQUENCE_BASH_TOOL, // Iteration 4: Bash command execution
    SEQUENCE_EDIT_WITH_DIFF, // Iteration 5: Edit with diff
    SEQUENCE_TODO_FLOW, // Iteration 6: Todo/plan progression
    SEQUENCE_PARALLEL, // Iteration 7: Parallel tool calls
    SEQUENCE_TOOL_ERROR, // Iteration 8: Error and recovery
    SEQUENCE_NESTED_AGENT, // Iteration 9: Nested agent (Task)
    SEQUENCE_TOOL_CALLS, // Iteration 10: Standard tool calls
  ],
  speed: 1.0,
  baseDelay: 300,
  ...(showPermissions && {
    permissionRequests: SAMPLE_PERMISSION_REQUESTS,
    schedulePermissionAt: { 2: 0 },
  }),
});

main({
  provider,
  maxIterations: 10,
  adapterName: "playback",
  showUsage: true,
  autoExit: false,
});
