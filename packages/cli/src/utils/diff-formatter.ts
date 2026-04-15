import { type Change, diffLines } from "diff";

export interface UnifiedDiffOptions {
  contextLines?: number;
}

export function generateUnifiedDiff(
  oldStr: string,
  newStr: string,
  filePath: string,
  options: UnifiedDiffOptions = {}
): string {
  const { contextLines = 3 } = options;
  const changes = diffLines(oldStr, newStr);
  const oldLines = oldStr.split("\n");

  const header = [`--- a/${filePath}`, `+++ b/${filePath}`];
  const hunks = buildHunks(changes, oldLines, contextLines);

  return [...header, ...hunks].join("\n");
}

interface HunkState {
  lines: string[];
  oldStart: number;
  newStart: number;
  oldCount: number;
  newCount: number;
}

interface LineTracker {
  oldLineNum: number;
  newLineNum: number;
}

function buildHunks(
  changes: Change[],
  oldLines: string[],
  contextLines: number
): string[] {
  const result: string[] = [];
  const tracker: LineTracker = { oldLineNum: 1, newLineNum: 1 };
  let hunk: HunkState | null = null;

  for (const change of changes) {
    const changeLines = splitChangeLines(change.value);
    const processed = processChange(
      change,
      changeLines,
      hunk,
      tracker,
      oldLines,
      contextLines,
      result
    );
    hunk = processed;
  }

  if (hunk) {
    result.push(...flushHunk(hunk));
  }

  return result;
}

function processChange(
  change: Change,
  changeLines: string[],
  hunk: HunkState | null,
  tracker: LineTracker,
  oldLines: string[],
  contextLines: number,
  result: string[]
): HunkState | null {
  if (change.added) {
    const h = ensureHunk(hunk, tracker, oldLines, contextLines);
    processAddedLines(h, changeLines, tracker);
    return h;
  }
  if (change.removed) {
    const h = ensureHunk(hunk, tracker, oldLines, contextLines);
    processRemovedLines(h, changeLines, tracker);
    return h;
  }
  return processContextLines(hunk, changeLines, tracker, contextLines, result);
}

function processAddedLines(
  hunk: HunkState,
  changeLines: string[],
  tracker: LineTracker
): void {
  for (const line of changeLines) {
    hunk.lines.push(`+${line}`);
    hunk.newCount++;
    tracker.newLineNum++;
  }
}

function processRemovedLines(
  hunk: HunkState,
  changeLines: string[],
  tracker: LineTracker
): void {
  for (const line of changeLines) {
    hunk.lines.push(`-${line}`);
    hunk.oldCount++;
    tracker.oldLineNum++;
  }
}

function processContextLines(
  hunk: HunkState | null,
  changeLines: string[],
  tracker: LineTracker,
  contextLines: number,
  result: string[]
): HunkState | null {
  let currentHunk = hunk;
  if (currentHunk) {
    addTrailingContext(currentHunk, changeLines, contextLines);
    if (changeLines.length > contextLines * 2) {
      result.push(...flushHunk(currentHunk));
      currentHunk = null;
    }
  }
  tracker.oldLineNum += changeLines.length;
  tracker.newLineNum += changeLines.length;
  return currentHunk;
}

function addTrailingContext(
  hunk: HunkState,
  changeLines: string[],
  contextLines: number
): void {
  const toAdd = Math.min(changeLines.length, contextLines);
  for (let i = 0; i < toAdd; i++) {
    hunk.lines.push(` ${changeLines[i] ?? ""}`);
    hunk.oldCount++;
    hunk.newCount++;
  }
}

function splitChangeLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function ensureHunk(
  hunk: HunkState | null,
  tracker: LineTracker,
  oldLines: string[],
  contextLines: number
): HunkState {
  if (hunk) {
    return hunk;
  }
  return createHunk(tracker, oldLines, contextLines);
}

function createHunk(
  tracker: LineTracker,
  oldLines: string[],
  contextLines: number
): HunkState {
  const newHunk: HunkState = {
    lines: [],
    oldStart: tracker.oldLineNum,
    newStart: tracker.newLineNum,
    oldCount: 0,
    newCount: 0,
  };
  addLeadingContext(newHunk, tracker.oldLineNum, oldLines, contextLines);
  return newHunk;
}

function addLeadingContext(
  hunk: HunkState,
  oldLineNum: number,
  oldLines: string[],
  contextLines: number
): void {
  const contextStart = Math.max(0, oldLineNum - 1 - contextLines);
  for (let i = contextStart; i < oldLineNum - 1; i++) {
    hunk.lines.push(` ${oldLines[i] ?? ""}`);
    hunk.oldCount++;
    hunk.newCount++;
  }
}

function flushHunk(hunk: HunkState): string[] {
  const header = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
  return [header, ...hunk.lines];
}
