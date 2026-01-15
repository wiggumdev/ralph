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
  SEQUENCE_SIMPLE_TASK,
  SEQUENCE_TOOL_CALLS,
} from "./test-harness/fixtures";

const provider = new PlaybackEngine({
  iterations: [
    SEQUENCE_TOOL_CALLS, // Iteration 1
    SEQUENCE_SIMPLE_TASK, // Iteration 2
    SEQUENCE_TOOL_CALLS, // Iteration 3
  ],
  speed: 1.0,
  baseDelay: 300,
});

main({
  provider,
  maxIterations: 3,
  adapterName: "playback",
  showUsage: true,
  autoExit: false,
});
