/**
 * Runtime type validation utilities
 *
 * Provides safe type checking and validation to replace unsafe 'as' casts.
 * Uses Zod schemas where available, type guards elsewhere.
 */

import { z } from "zod";
import type { OutputFormat } from "#parsers/types";
import { type Prd, PrdSchema } from "#schema/prd";

/**
 * Validates that a string is a valid OutputFormat
 */
export function isOutputFormat(value: unknown): value is OutputFormat {
  return (
    typeof value === "string" &&
    (value === "stream-json" || value === "opencode-json" || value === "text")
  );
}

/**
 * Safely parses and validates PRD JSON data
 */
export function parsePrd(jsonString: string): Prd {
  try {
    const data = JSON.parse(jsonString);
    const result = PrdSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Invalid PRD format: ${result.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in PRD file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Schema for StreamJsonMessage validation
 */
export const StreamJsonMessageSchema = z
  .object({
    type: z.string(),
    subtype: z.string().optional(),
    session_id: z.string().optional(),
    result: z.string().optional(),
    content: z.string().optional(),
    message: z.unknown().optional(),
  })
  .passthrough(); // Allow additional properties

export type ValidatedStreamJsonMessage = z.infer<
  typeof StreamJsonMessageSchema
>;

/**
 * Safely parses JSON with schema validation
 */
export function parseStreamJsonMessage(
  jsonString: string
): ValidatedStreamJsonMessage {
  try {
    const data = JSON.parse(jsonString);
    const result = StreamJsonMessageSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Invalid stream JSON message: ${result.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in stream message: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Schema for OpenCode event validation
 */
export const OpenCodeEventSchema = z
  .object({
    event: z.string(),
    data: z.unknown().optional(),
  })
  .passthrough();

export type ValidatedOpenCodeEvent = z.infer<typeof OpenCodeEventSchema>;

/**
 * Safely parses OpenCode JSON events
 */
export function parseOpenCodeEvent(jsonString: string): ValidatedOpenCodeEvent {
  try {
    const data = JSON.parse(jsonString);
    const result = OpenCodeEventSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Invalid OpenCode event: ${result.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in OpenCode event: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Type guard for plain objects (not arrays, null, Date, etc.)
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Validates TOML parser output is a plain object
 * Throws if output is not a valid object structure
 */
export function validateTomlOutput(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(
      "TOML parsing produced invalid output - expected plain object"
    );
  }
  return value;
}

/**
 * TodoItem schema for runtime validation
 */
export const TodoItemSchema = z.object({
  content: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed"]),
});

export type ValidatedTodoItem = z.infer<typeof TodoItemSchema>;

/**
 * Type guard for TodoItem
 */
export function isTodoItem(value: unknown): value is ValidatedTodoItem {
  const result = TodoItemSchema.safeParse(value);
  return result.success;
}

/**
 * Type guard for TodoItem array
 */
export function isTodoItemArray(value: unknown): value is ValidatedTodoItem[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => isTodoItem(item));
}

/**
 * Type guard for string or undefined
 */
export function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

/**
 * Type guard for string array or undefined
 */
export function isOptionalStringArray(
  value: unknown
): value is string[] | undefined {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => typeof item === "string");
}
