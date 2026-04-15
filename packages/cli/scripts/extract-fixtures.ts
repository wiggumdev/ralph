#!/usr/bin/env bun
/**
 * Extract ACP protocol messages from verbose log files.
 * Parses log files and groups by sessionUpdate type.
 *
 * Usage: bun scripts/extract-fixtures.ts ~/Desktop/logs/*.log
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

interface AcpUpdate {
  sessionUpdate: string;
  [key: string]: unknown;
}

interface ParseResult {
  file: string;
  messages: AcpUpdate[];
  errors: string[];
}

// Regex to extract JSON update from log line
const ACP_IN_REGEX = /update=(\{.*\}) ACP IN$/;

async function parseLogFile(filePath: string): Promise<ParseResult> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const messages: AcpUpdate[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    if (!line.includes("ACP IN")) {
      continue;
    }

    const match = line.match(ACP_IN_REGEX);
    if (!match?.[1]) {
      continue;
    }

    const json = match[1];
    try {
      const update = JSON.parse(json) as AcpUpdate;
      messages.push(update);
    } catch {
      errors.push(`Failed to parse: ${json.slice(0, 100)}...`);
    }
  }

  return { file: basename(filePath), messages, errors };
}

interface GroupedMessages {
  [type: string]: AcpUpdate[];
}

function groupByType(messages: AcpUpdate[]): GroupedMessages {
  const grouped: GroupedMessages = {};
  for (const msg of messages) {
    const type = msg.sessionUpdate;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(msg);
  }
  return grouped;
}

function summarizeType(messages: AcpUpdate[]): string {
  const first = messages[0];
  if (!first) {
    return "  (none)";
  }

  const keys = Object.keys(first).filter((k) => k !== "sessionUpdate");
  return `  count=${messages.length}, keys=[${keys.join(", ")}]`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: bun scripts/extract-fixtures.ts <log-files...>");
    console.log(
      "Example: bun scripts/extract-fixtures.ts ~/Desktop/logs/*.log"
    );
    process.exit(1);
  }

  console.log("\n=== ACP Message Extraction ===\n");
  console.log(`Processing ${args.length} log file(s)...\n`);

  const allMessages: AcpUpdate[] = [];
  let totalErrors = 0;

  for (const file of args) {
    const result = await parseLogFile(file);
    allMessages.push(...result.messages);
    totalErrors += result.errors.length;
    console.log(`  ${result.file}: ${result.messages.length} messages`);
  }

  console.log(
    `\nTotal: ${allMessages.length} messages, ${totalErrors} parse errors\n`
  );

  // Group by sessionUpdate type
  const grouped = groupByType(allMessages);
  const types = Object.keys(grouped).sort();

  console.log("=== Message Types ===\n");
  for (const type of types) {
    const msgs = grouped[type] ?? [];
    console.log(`${type}:`);
    console.log(summarizeType(msgs));
    console.log();
  }

  // Show sample of each type
  console.log("=== Sample Messages ===\n");
  for (const type of types) {
    const messages = grouped[type] ?? [];
    console.log(`--- ${type} ---`);
    console.log(JSON.stringify(messages[0], null, 2));
    console.log();
  }

  // Look for specific patterns
  console.log("=== Special Patterns ===\n");

  // Tool calls by title
  const toolCalls = grouped.tool_call || [];
  const toolNames = new Map<string, number>();
  for (const call of toolCalls) {
    const title = (call.title as string)?.toLowerCase() ?? "unknown";
    toolNames.set(title, (toolNames.get(title) || 0) + 1);
  }
  console.log("Tool call types:");
  for (const [name, count] of [...toolNames.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${name}: ${count}`);
  }
  console.log();

  // Tool results with content
  const updates = grouped.tool_call_update || [];
  const withContent = updates.filter(
    (u) => Array.isArray(u.content) && (u.content as unknown[]).length > 0
  );
  console.log(`Tool updates with content: ${withContent.length}`);

  // Diff content
  const withDiff = updates.filter(
    (u) =>
      Array.isArray(u.content) &&
      (u.content as { type: string }[]).some((c) => c.type === "diff")
  );
  console.log(`Tool updates with diffs: ${withDiff.length}`);

  // Terminal content
  const withTerminal = updates.filter(
    (u) =>
      Array.isArray(u.content) &&
      (u.content as { type: string }[]).some((c) => c.type === "terminal")
  );
  console.log(`Tool updates with terminal: ${withTerminal.length}`);

  // Error status
  const failed = updates.filter((u) => u.status === "failed");
  console.log(`Failed tool calls: ${failed.length}`);

  console.log();

  // Export sample fixture data
  if (withDiff.length > 0) {
    console.log("=== Sample Diff ===");
    console.log(JSON.stringify(withDiff[0], null, 2));
    console.log();
  }

  if (withContent.length > 0) {
    console.log("=== Sample Tool Result ===");
    console.log(JSON.stringify(withContent[0], null, 2));
    console.log();
  }
}

main().catch(console.error);
