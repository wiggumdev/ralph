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
  // Show permission modal before message index 2 in iteration 1
  permissionRequests: SAMPLE_PERMISSION_REQUESTS,
  schedulePermissionAt: { 2: 0 }, // Before message 2, show permission request 0
});

main({
  provider,
  maxIterations: 3,
  adapterName: "playback",
  showUsage: true,
  autoExit: false,
});
