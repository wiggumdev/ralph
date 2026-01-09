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
  PrdSchema,
  PrdFeatureSchema,
  validatePrd,
  type PrdFeature,
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
