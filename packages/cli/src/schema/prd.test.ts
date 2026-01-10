/**
 * PRD Schema Tests
 *
 * These tests validate the Product Requirements Document (PRD) schema.
 * The PRD is the core requirements specification that drives the agent:
 * - Defines features with categories, titles, descriptions, and acceptance criteria
 * - Tracks which features pass/fail validation
 * - Ensures requirements are well-formed before agent execution
 *
 * Testing this module prevents malformed PRD files from causing
 * confusing errors during agent runs or incomplete feature tracking.
 */

import { describe, expect, test } from "bun:test";
import {
  EXAMPLE_PRD,
  EXAMPLE_PRD_FEATURE,
  MINIMAL_PRD_FEATURE,
  PRD_FIELD_DOCS,
  type PrdFeature,
  PrdFeatureSchema,
  PrdSchema,
  type Priority,
  PrioritySchema,
  getPrdFeatureJsonSchema,
  getPrdJsonSchema,
  validatePrd,
} from "./prd";

describe("PrdFeatureSchema", () => {
  /**
   * Tests that a complete valid feature passes validation.
   * This represents the expected structure of feature definitions.
   */
  test("accepts valid feature", () => {
    const feature: PrdFeature = {
      category: "Authentication",
      title: "User Login",
      description: "Users can log in with email and password",
      passes: false,
      acceptance: ["Login form is displayed", "Valid credentials grant access"],
    };

    const result = PrdFeatureSchema.safeParse(feature);
    expect(result.success).toBe(true);
  });

  /**
   * Tests that features with passes=true are accepted.
   * This indicates a feature that already meets requirements.
   */
  test("accepts feature with passes true", () => {
    const feature: PrdFeature = {
      category: "Core",
      title: "Completed Feature",
      description: "Already implemented",
      passes: true,
      acceptance: ["Criteria met"],
    };

    const result = PrdFeatureSchema.safeParse(feature);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.passes).toBe(true);
    }
  });

  describe("required fields", () => {
    /**
     * Tests that category is required.
     * Features must be categorized for organization.
     */
    test("rejects missing category", () => {
      const result = PrdFeatureSchema.safeParse({
        title: "Feature",
        description: "Desc",
        passes: false,
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that title is required.
     * Features must have a name for identification.
     */
    test("rejects missing title", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        description: "Desc",
        passes: false,
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that description is required.
     * Features must have a description explaining their purpose.
     */
    test("rejects missing description", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        passes: false,
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that passes field is required.
     * This boolean tracks feature completion status.
     */
    test("rejects missing passes", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        description: "Desc",
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that acceptance criteria is required.
     * Features must have criteria to determine if they pass.
     */
    test("rejects missing acceptance", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        description: "Desc",
        passes: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("string validation", () => {
    /**
     * Tests that empty category strings are rejected.
     * Categories must have meaningful content.
     */
    test("rejects empty category", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "",
        title: "Feature",
        description: "Desc",
        passes: false,
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that empty title strings are rejected.
     * Titles must have meaningful content.
     */
    test("rejects empty title", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "",
        description: "Desc",
        passes: false,
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that empty description strings are rejected.
     * Descriptions must have meaningful content.
     */
    test("rejects empty description", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        description: "",
        passes: false,
        acceptance: ["Criteria"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("acceptance array validation", () => {
    /**
     * Tests that empty acceptance arrays are rejected.
     * Features must have at least one acceptance criterion.
     */
    test("rejects empty acceptance array", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        description: "Desc",
        passes: false,
        acceptance: [],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that acceptance criteria cannot contain empty strings.
     * Each criterion must have meaningful content.
     */
    test("rejects empty string in acceptance array", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        description: "Desc",
        passes: false,
        acceptance: ["Valid criteria", ""],
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that multiple acceptance criteria are accepted.
     * Features often have multiple criteria to check.
     */
    test("accepts multiple acceptance criteria", () => {
      const result = PrdFeatureSchema.safeParse({
        category: "Category",
        title: "Feature",
        description: "Desc",
        passes: false,
        acceptance: ["Criterion 1", "Criterion 2", "Criterion 3"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptance).toHaveLength(3);
      }
    });
  });

  describe("optional fields", () => {
    const baseFeature = {
      category: "Category",
      title: "Feature",
      description: "Desc",
      passes: false,
      acceptance: ["Criterion"],
    };

    /**
     * Tests that optional id field is accepted with valid format.
     * IDs should be lowercase alphanumeric with hyphens.
     */
    test("accepts valid id", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        id: "user-auth-login",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("user-auth-login");
      }
    });

    /**
     * Tests that id rejects invalid formats.
     * IDs must be lowercase alphanumeric with hyphens only.
     */
    test("rejects invalid id format", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        id: "User_Auth", // Invalid: uppercase and underscore
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that priority accepts valid enum values.
     */
    test("accepts valid priority values", () => {
      const priorities: Priority[] = ["critical", "high", "medium", "low"];
      for (const priority of priorities) {
        const result = PrdFeatureSchema.safeParse({
          ...baseFeature,
          priority,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priority).toBe(priority);
        }
      }
    });

    /**
     * Tests that priority rejects invalid values.
     */
    test("rejects invalid priority", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        priority: "urgent", // Not a valid enum value
      });
      expect(result.success).toBe(false);
    });

    /**
     * Tests that dependencies array is accepted.
     */
    test("accepts dependencies array", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        dependencies: ["feature-a", "feature-b"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dependencies).toEqual(["feature-a", "feature-b"]);
      }
    });

    /**
     * Tests that technicalNotes string is accepted.
     */
    test("accepts technicalNotes", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        technicalNotes: "Use existing AuthService class",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.technicalNotes).toBe("Use existing AuthService class");
      }
    });

    /**
     * Tests that testStrategy string is accepted.
     */
    test("accepts testStrategy", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        testStrategy: "Unit tests for validation logic",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.testStrategy).toBe("Unit tests for validation logic");
      }
    });

    /**
     * Tests that suggestedFiles array is accepted.
     */
    test("accepts suggestedFiles array", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        suggestedFiles: ["src/auth.ts", "src/routes/**/*.ts"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suggestedFiles).toEqual([
          "src/auth.ts",
          "src/routes/**/*.ts",
        ]);
      }
    });

    /**
     * Tests that outOfScope array is accepted.
     */
    test("accepts outOfScope array", () => {
      const result = PrdFeatureSchema.safeParse({
        ...baseFeature,
        outOfScope: ["OAuth support", "Password reset"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outOfScope).toEqual(["OAuth support", "Password reset"]);
      }
    });

    /**
     * Tests that a fully populated feature with all optional fields is accepted.
     */
    test("accepts feature with all optional fields", () => {
      const fullFeature: PrdFeature = {
        id: "full-feature",
        category: "Testing",
        title: "Full Feature",
        description: "A feature with all fields populated",
        passes: false,
        acceptance: ["Criterion 1", "Criterion 2"],
        priority: "high",
        dependencies: ["dep-1", "dep-2"],
        technicalNotes: "Technical notes here",
        testStrategy: "Test strategy here",
        suggestedFiles: ["src/file1.ts", "src/file2.ts"],
        outOfScope: ["Scope exclusion 1"],
      };
      const result = PrdFeatureSchema.safeParse(fullFeature);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(fullFeature);
      }
    });
  });
});

describe("PrioritySchema", () => {
  /**
   * Tests that all valid priority values are accepted.
   */
  test("accepts valid priorities", () => {
    expect(PrioritySchema.safeParse("critical").success).toBe(true);
    expect(PrioritySchema.safeParse("high").success).toBe(true);
    expect(PrioritySchema.safeParse("medium").success).toBe(true);
    expect(PrioritySchema.safeParse("low").success).toBe(true);
  });

  /**
   * Tests that invalid priority values are rejected.
   */
  test("rejects invalid priorities", () => {
    expect(PrioritySchema.safeParse("urgent").success).toBe(false);
    expect(PrioritySchema.safeParse("CRITICAL").success).toBe(false);
    expect(PrioritySchema.safeParse("").success).toBe(false);
    expect(PrioritySchema.safeParse(1).success).toBe(false);
  });
});

describe("PrdSchema", () => {
  /**
   * Tests that a valid PRD array passes validation.
   * A PRD is an array of feature definitions.
   */
  test("accepts valid PRD array", () => {
    const prd = [
      {
        category: "Core",
        title: "Feature 1",
        description: "First feature",
        passes: false,
        acceptance: ["Criteria 1"],
      },
      {
        category: "Core",
        title: "Feature 2",
        description: "Second feature",
        passes: true,
        acceptance: ["Criteria 2"],
      },
    ];

    const result = PrdSchema.safeParse(prd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  /**
   * Tests that empty PRD arrays are rejected.
   * A PRD must have at least one feature to be meaningful.
   */
  test("rejects empty PRD array", () => {
    const result = PrdSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  /**
   * Tests that single-feature PRDs are accepted.
   * The minimum valid PRD has one feature.
   */
  test("accepts single feature PRD", () => {
    const prd = [
      {
        category: "Core",
        title: "Only Feature",
        description: "The only feature",
        passes: false,
        acceptance: ["Criterion"],
      },
    ];

    const result = PrdSchema.safeParse(prd);
    expect(result.success).toBe(true);
  });

  /**
   * Tests that invalid features cause PRD validation to fail.
   * One bad feature should invalidate the entire PRD.
   */
  test("rejects PRD with invalid feature", () => {
    const prd = [
      {
        category: "Core",
        title: "Valid Feature",
        description: "Good feature",
        passes: false,
        acceptance: ["Criteria"],
      },
      {
        category: "Core",
        title: "", // Invalid: empty title
        description: "Bad feature",
        passes: false,
        acceptance: ["Criteria"],
      },
    ];

    const result = PrdSchema.safeParse(prd);
    expect(result.success).toBe(false);
  });
});

describe("validatePrd", () => {
  /**
   * Tests that validatePrd returns valid result for correct data.
   * This is the primary validation function used by the check command.
   */
  test("returns valid result for correct PRD", () => {
    const prd = [
      {
        category: "Core",
        title: "Feature",
        description: "Description",
        passes: false,
        acceptance: ["Criterion"],
      },
    ];

    const result = validatePrd(prd);
    expect(result.valid).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.errors).toBeUndefined();
  });

  /**
   * Tests that validatePrd returns error details for invalid data.
   * Error messages should help users understand what's wrong.
   */
  test("returns errors for invalid PRD", () => {
    const invalidPrd = [
      {
        category: "Core",
        // Missing required fields
      },
    ];

    const result = validatePrd(invalidPrd);
    expect(result.valid).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  /**
   * Tests that validatePrd handles completely wrong types gracefully.
   * Users might accidentally pass non-array data.
   */
  test("handles non-array input", () => {
    const result = validatePrd("not an array");
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  /**
   * Tests that validatePrd handles null/undefined gracefully.
   * Edge case when PRD file is empty or malformed.
   */
  test("handles null input", () => {
    const result = validatePrd(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  /**
   * Tests that error messages include path information.
   * This helps users locate the exact problem in their PRD file.
   */
  test("error messages include field paths", () => {
    const invalidPrd = [
      {
        category: "Core",
        title: "Feature",
        description: "Desc",
        passes: false,
        acceptance: [], // Invalid: empty array
      },
    ];

    const result = validatePrd(invalidPrd);
    expect(result.valid).toBe(false);
    // Error should reference the path to the problem
    const hasPathInfo = result.errors?.some(
      (e) => e.includes("0") && e.includes("acceptance")
    );
    expect(hasPathInfo).toBe(true);
  });

  /**
   * Tests that validatePrd returns the parsed data on success.
   * The returned data should match the validated input.
   */
  test("returns parsed data matching input on success", () => {
    const prd = [
      {
        category: "Testing",
        title: "Test Feature",
        description: "A test feature",
        passes: true,
        acceptance: ["First criterion", "Second criterion"],
      },
    ];

    const result = validatePrd(prd);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(prd);
  });
});

describe("exported examples", () => {
  /**
   * Tests that EXAMPLE_PRD_FEATURE passes validation.
   * This ensures the documented example is always valid.
   */
  test("EXAMPLE_PRD_FEATURE is valid", () => {
    const result = PrdFeatureSchema.safeParse(EXAMPLE_PRD_FEATURE);
    expect(result.success).toBe(true);
  });

  /**
   * Tests that MINIMAL_PRD_FEATURE passes validation.
   * This ensures the minimal example is always valid.
   */
  test("MINIMAL_PRD_FEATURE is valid", () => {
    const result = PrdFeatureSchema.safeParse(MINIMAL_PRD_FEATURE);
    expect(result.success).toBe(true);
  });

  /**
   * Tests that EXAMPLE_PRD passes validation.
   * This ensures the full PRD example is always valid.
   */
  test("EXAMPLE_PRD is valid", () => {
    const result = PrdSchema.safeParse(EXAMPLE_PRD);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(3);
    }
  });

  /**
   * Tests that EXAMPLE_PRD_FEATURE has all optional fields populated.
   * This ensures it serves as a comprehensive example.
   */
  test("EXAMPLE_PRD_FEATURE has all optional fields", () => {
    expect(EXAMPLE_PRD_FEATURE.id).toBeDefined();
    expect(EXAMPLE_PRD_FEATURE.priority).toBeDefined();
    expect(EXAMPLE_PRD_FEATURE.dependencies).toBeDefined();
    expect(EXAMPLE_PRD_FEATURE.technicalNotes).toBeDefined();
    expect(EXAMPLE_PRD_FEATURE.testStrategy).toBeDefined();
    expect(EXAMPLE_PRD_FEATURE.suggestedFiles).toBeDefined();
    expect(EXAMPLE_PRD_FEATURE.outOfScope).toBeDefined();
  });

  /**
   * Tests that MINIMAL_PRD_FEATURE has no optional fields.
   * This ensures it serves as a minimal example.
   */
  test("MINIMAL_PRD_FEATURE has no optional fields", () => {
    expect(MINIMAL_PRD_FEATURE.id).toBeUndefined();
    expect(MINIMAL_PRD_FEATURE.priority).toBeUndefined();
    expect(MINIMAL_PRD_FEATURE.dependencies).toBeUndefined();
    expect(MINIMAL_PRD_FEATURE.technicalNotes).toBeUndefined();
    expect(MINIMAL_PRD_FEATURE.testStrategy).toBeUndefined();
    expect(MINIMAL_PRD_FEATURE.suggestedFiles).toBeUndefined();
    expect(MINIMAL_PRD_FEATURE.outOfScope).toBeUndefined();
  });
});

describe("PRD_FIELD_DOCS", () => {
  /**
   * Tests that PRD_FIELD_DOCS covers all schema fields.
   */
  test("documents all schema fields", () => {
    const documentedFields = Object.keys(PRD_FIELD_DOCS);
    const expectedFields = [
      "id",
      "category",
      "title",
      "description",
      "passes",
      "acceptance",
      "priority",
      "dependencies",
      "technicalNotes",
      "testStrategy",
      "suggestedFiles",
      "outOfScope",
    ];
    expect(documentedFields.sort()).toEqual(expectedFields.sort());
  });

  /**
   * Tests that each field doc has required properties.
   */
  test("each field has required doc properties", () => {
    for (const [field, doc] of Object.entries(PRD_FIELD_DOCS)) {
      expect(doc).toHaveProperty("required");
      expect(doc).toHaveProperty("description");
      expect(doc).toHaveProperty("example");
      expect(doc).toHaveProperty("llmValue");
      expect(typeof doc.required).toBe("boolean");
      expect(typeof doc.description).toBe("string");
      expect(typeof doc.llmValue).toBe("string");
    }
  });
});

describe("JSON Schema export", () => {
  /**
   * Tests that getPrdJsonSchema returns valid JSON Schema.
   */
  test("getPrdJsonSchema returns valid schema", () => {
    const schema = getPrdJsonSchema();
    expect(schema).toHaveProperty("$schema");
    expect(schema).toHaveProperty("type", "array");
    expect(schema).toHaveProperty("items");
    expect(schema).toHaveProperty("description");
  });

  /**
   * Tests that getPrdFeatureJsonSchema returns valid JSON Schema.
   */
  test("getPrdFeatureJsonSchema returns valid schema", () => {
    const schema = getPrdFeatureJsonSchema();
    expect(schema).toHaveProperty("$schema");
    expect(schema).toHaveProperty("type", "object");
    expect(schema).toHaveProperty("properties");
    expect(schema).toHaveProperty("required");
  });

  /**
   * Tests that the JSON Schema includes field descriptions.
   * This is critical for LLM understanding.
   */
  test("JSON Schema includes field descriptions", () => {
    const schema = getPrdFeatureJsonSchema() as {
      properties: Record<string, { description?: string }>;
    };
    const properties = schema.properties;

    // Check that key fields have descriptions
    expect(properties.id?.description).toBeDefined();
    expect(properties.category?.description).toBeDefined();
    expect(properties.title?.description).toBeDefined();
    expect(properties.description?.description).toBeDefined();
    expect(properties.passes?.description).toBeDefined();
    expect(properties.acceptance?.description).toBeDefined();
    expect(properties.priority?.description).toBeDefined();
  });

  /**
   * Tests that required fields are correctly marked in JSON Schema.
   */
  test("JSON Schema marks required fields correctly", () => {
    const schema = getPrdFeatureJsonSchema() as { required: string[] };
    expect(schema.required).toContain("category");
    expect(schema.required).toContain("title");
    expect(schema.required).toContain("description");
    expect(schema.required).toContain("passes");
    expect(schema.required).toContain("acceptance");
    // Optional fields should not be in required
    expect(schema.required).not.toContain("id");
    expect(schema.required).not.toContain("priority");
    expect(schema.required).not.toContain("dependencies");
  });

  /**
   * Tests that priority enum values are included in JSON Schema.
   */
  test("JSON Schema includes priority enum values", () => {
    const schema = getPrdFeatureJsonSchema() as {
      properties: { priority: { enum?: string[] } };
    };
    const prioritySchema = schema.properties.priority;
    expect(prioritySchema.enum).toEqual(["critical", "high", "medium", "low"]);
  });
});
