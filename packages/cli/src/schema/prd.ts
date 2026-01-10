import { z } from "zod";

/**
 * Priority levels for feature ordering.
 * LLMs use this to determine which feature to work on first when multiple
 * features are available. Higher priority features should be implemented
 * before lower priority ones.
 */
export const PrioritySchema = z
  .enum(["critical", "high", "medium", "low"])
  .describe(
    "Feature priority level. Critical features block other work, high priority features should be done first."
  );

/**
 * PRD Feature Schema
 *
 * Defines a single feature requirement that an LLM agent will implement.
 * The schema is designed to provide maximum context for autonomous development
 * while keeping the structure simple enough to author by hand.
 *
 * Design principles:
 * - Required fields define WHAT needs to be done
 * - Optional fields provide context for HOW to implement
 * - The 'passes' field is the ONLY field the agent modifies
 */
export const PrdFeatureSchema = z.object({
  /**
   * Unique identifier for referencing this feature in dependencies,
   * commit messages, and progress tracking.
   */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens")
    .optional()
    .describe(
      "Unique identifier for cross-referencing (e.g., 'user-auth', 'api-rate-limiting'). Use lowercase with hyphens."
    ),

  /**
   * Grouping category for organizing related features.
   * Helps LLMs understand the domain area and find related code.
   */
  category: z
    .string()
    .min(1)
    .describe(
      "Feature category for grouping (e.g., 'Authentication', 'API', 'UI', 'Testing'). Helps locate related code."
    ),

  /**
   * Human-readable feature name.
   * Should be concise but descriptive enough to understand at a glance.
   */
  title: z
    .string()
    .min(1)
    .describe(
      "Concise feature title (e.g., 'User Login', 'Rate Limiting Middleware'). Used in progress reports."
    ),

  /**
   * Detailed description of what the feature should do.
   * This is the primary context for the LLM to understand requirements.
   */
  description: z
    .string()
    .min(1)
    .describe(
      "Detailed feature description explaining the expected behavior, user value, and any important context."
    ),

  /**
   * Whether this feature has been implemented and verified.
   * THIS IS THE ONLY FIELD THE AGENT SHOULD MODIFY.
   */
  passes: z
    .boolean()
    .describe(
      "Completion status. Set to true only after implementation passes all acceptance criteria and tests."
    ),

  /**
   * List of specific, testable criteria that define feature completion.
   * Each criterion should be verifiable through code inspection or tests.
   */
  acceptance: z
    .array(
      z
        .string()
        .min(1)
        .describe("A specific, testable criterion for feature completion")
    )
    .min(1)
    .describe(
      "Acceptance criteria list. Each item should be independently verifiable. Write as assertions (e.g., 'Login form validates email format')."
    ),

  /**
   * Priority level for feature ordering.
   * Helps LLMs decide which feature to implement when multiple are available.
   */
  priority: PrioritySchema.optional().describe(
    "Feature priority for ordering work. Defaults to 'medium' if not specified."
  ),

  /**
   * IDs of features that must pass before this one can be implemented.
   * Enables complex feature graphs where some features build on others.
   */
  dependencies: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Array of feature IDs that must pass before this feature can be started. Prevents working out of order."
    ),

  /**
   * Technical implementation notes, constraints, or patterns to follow.
   * Provides LLMs with codebase-specific context they wouldn't otherwise know.
   */
  technicalNotes: z
    .string()
    .optional()
    .describe(
      "Implementation hints: patterns to follow, libraries to use, constraints to respect (e.g., 'Use existing AuthService', 'Must support IE11')."
    ),

  /**
   * Testing approach and verification strategy.
   * Guides LLMs on what kind of tests to write and how to verify correctness.
   */
  testStrategy: z
    .string()
    .optional()
    .describe(
      "Testing guidance: test types needed (unit/integration/e2e), what to mock, edge cases to cover."
    ),

  /**
   * Files that are likely relevant to this feature.
   * Dramatically reduces exploration time for LLMs.
   */
  suggestedFiles: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Paths to files likely needing changes or examination. Glob patterns allowed (e.g., 'src/auth/**/*.ts')."
    ),

  /**
   * Explicit list of things that should NOT be implemented.
   * Prevents over-engineering and scope creep.
   */
  outOfScope: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Explicit exclusions to prevent over-engineering (e.g., 'No OAuth support yet', 'Skip mobile responsive')."
    ),
});

export const PrdSchema = z
  .array(PrdFeatureSchema)
  .min(1)
  .describe(
    "Product Requirements Document: an array of features to be implemented by an LLM agent."
  );

export type Priority = z.infer<typeof PrioritySchema>;
export type PrdFeature = z.infer<typeof PrdFeatureSchema>;
export type Prd = z.infer<typeof PrdSchema>;

/**
 * Comprehensive example demonstrating all PRD feature fields.
 * Use this as a reference when authoring prd.json files.
 *
 * This example shows a realistic feature with all optional fields filled in,
 * demonstrating how each field provides value for LLM-driven development.
 */
export const EXAMPLE_PRD_FEATURE: PrdFeature = {
  id: "user-auth-login",
  category: "Authentication",
  title: "User Login",
  description:
    "Allow users to log in with email and password. The system should validate credentials against the database, create a session token, and return appropriate error messages for invalid attempts.",
  passes: false,
  acceptance: [
    "Login form accepts email and password inputs",
    "Valid credentials return a JWT token with 24h expiry",
    "Invalid credentials return 401 with error message",
    "Email format is validated before submission",
    "Password field masks input characters",
    "Rate limiting prevents brute force (max 5 attempts per minute)",
  ],
  priority: "high",
  dependencies: ["database-setup", "user-model"],
  technicalNotes:
    "Use existing AuthService class in src/services/auth.ts. Follow the repository pattern for database access. JWT secret is in environment variables.",
  testStrategy:
    "Unit tests for validation logic, integration tests for auth flow with test database. Mock the email service. Test rate limiting with rapid sequential requests.",
  suggestedFiles: [
    "src/services/auth.ts",
    "src/routes/auth.ts",
    "src/models/user.ts",
    "src/middleware/rate-limit.ts",
  ],
  outOfScope: [
    "OAuth/social login (separate feature)",
    "Password reset flow",
    "Remember me functionality",
    "Multi-factor authentication",
  ],
};

/**
 * Minimal example showing only required fields.
 * Most PRDs will include at least priority and some acceptance criteria.
 */
export const MINIMAL_PRD_FEATURE: PrdFeature = {
  category: "Core",
  title: "Hello World",
  description: "Display a hello world message on the home page",
  passes: false,
  acceptance: ["Home page displays 'Hello World' text"],
};

/**
 * Example PRD array with multiple features demonstrating dependencies.
 */
export const EXAMPLE_PRD: Prd = [
  {
    id: "database-setup",
    category: "Infrastructure",
    title: "Database Connection",
    description: "Set up PostgreSQL connection with connection pooling",
    passes: true, // Already completed
    acceptance: [
      "Database connection established on startup",
      "Connection pool configured with max 20 connections",
    ],
    priority: "critical",
    technicalNotes: "Use pg library with connection string from DATABASE_URL",
    suggestedFiles: ["src/db/connection.ts", "src/config/database.ts"],
  },
  {
    id: "user-model",
    category: "Models",
    title: "User Model",
    description: "Create user model with email, hashed password, and timestamps",
    passes: true, // Already completed
    acceptance: [
      "User table created with migration",
      "Password is hashed before storage",
      "Created/updated timestamps auto-managed",
    ],
    priority: "critical",
    dependencies: ["database-setup"],
    suggestedFiles: ["src/models/user.ts", "src/migrations/001_users.sql"],
  },
  EXAMPLE_PRD_FEATURE, // The login feature depends on both above
];

export interface PrdValidationResult {
  valid: boolean;
  data?: Prd;
  errors?: string[];
}

export function validatePrd(data: unknown): PrdValidationResult {
  const result = PrdSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { valid: false, errors };
}

/**
 * Field documentation for PRD schema.
 * Maps field names to their descriptions and whether they're required.
 * Useful for generating documentation or help text.
 */
export const PRD_FIELD_DOCS = {
  id: {
    required: false,
    description: "Unique identifier for cross-referencing features",
    example: "user-auth-login",
    llmValue:
      "Enables dependency tracking and consistent references in commits/logs",
  },
  category: {
    required: true,
    description: "Feature category for grouping related features",
    example: "Authentication",
    llmValue: "Helps locate related code and understand domain context",
  },
  title: {
    required: true,
    description: "Concise feature title",
    example: "User Login",
    llmValue: "Used in progress reports and commit messages",
  },
  description: {
    required: true,
    description: "Detailed feature description",
    example: "Allow users to log in with email and password...",
    llmValue: "Primary context for understanding requirements",
  },
  passes: {
    required: true,
    description: "Completion status (ONLY field agent modifies)",
    example: false,
    llmValue: "Agent sets to true after verifying all acceptance criteria",
  },
  acceptance: {
    required: true,
    description: "List of testable acceptance criteria",
    example: ["Login form accepts email input", "Invalid credentials return 401"],
    llmValue: "Defines exactly when the feature is complete",
  },
  priority: {
    required: false,
    description: "Feature priority (critical, high, medium, low)",
    example: "high",
    llmValue: "Helps agent decide which feature to work on first",
  },
  dependencies: {
    required: false,
    description: "Array of feature IDs that must pass first",
    example: ["database-setup", "user-model"],
    llmValue: "Prevents working on features before prerequisites exist",
  },
  technicalNotes: {
    required: false,
    description: "Implementation hints and constraints",
    example: "Use existing AuthService class in src/services/auth.ts",
    llmValue: "Provides codebase-specific context for better implementation",
  },
  testStrategy: {
    required: false,
    description: "Testing approach and verification strategy",
    example: "Unit tests for validation, integration tests for auth flow",
    llmValue: "Guides agent on what tests to write and how to verify",
  },
  suggestedFiles: {
    required: false,
    description: "Files likely needing changes",
    example: ["src/services/auth.ts", "src/routes/auth.ts"],
    llmValue: "Dramatically reduces codebase exploration time",
  },
  outOfScope: {
    required: false,
    description: "What NOT to implement",
    example: ["OAuth/social login", "Password reset flow"],
    llmValue: "Prevents over-engineering and keeps focus narrow",
  },
} as const;

/**
 * Export the PRD schema as a JSON Schema object.
 * This can be used to:
 * - Generate documentation
 * - Provide schema to LLMs for generating valid PRD files
 * - Validate PRD files in editors that support JSON Schema
 *
 * @returns JSON Schema representation of the PRD schema
 */
export function getPrdJsonSchema(): Record<string, unknown> {
  return PrdSchema.toJSONSchema();
}

/**
 * Export the PrdFeature schema as a JSON Schema object.
 * Useful for documenting individual feature structure.
 *
 * @returns JSON Schema representation of a single PRD feature
 */
export function getPrdFeatureJsonSchema(): Record<string, unknown> {
  return PrdFeatureSchema.toJSONSchema();
}
