---
name: ralph-prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
---

# PRD Generator

Create detailed Product Requirements Documents that are clear, actionable, and suitable for implementation.

---

## The Job

1. Receive a feature description from the user
2. Ask 3-5 essential clarifying questions (with lettered options)
3. Generate a structured PRD based on answers
4. Save to `.plans/prd.json`

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

### Format Questions Like This:

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Other: [please specify]

2. Who is the target user?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the scope?
   A. Minimal viable version
   B. Full-featured implementation
   C. Just the backend/API
   D. Just the UI
```

This lets users respond with "1A, 2C, 3B" for quick iteration.

---

## Step 2: PRD Structure

Generate the PRD json based on the following json schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "minItems": 1,
  "description": "Product Requirements Document: an array of features to be implemented by an LLM agent.",
  "items": {
    "type": "object",
    "required": ["category", "title", "description", "passes", "acceptance"],
    "properties": {
      "id": {
        "type": "string",
        "minLength": 1,
        "pattern": "^[a-z0-9-]+$",
        "description": "Unique identifier for cross-referencing (e.g., 'user-auth', 'api-rate-limiting'). Use lowercase with hyphens."
      },
      "category": {
        "type": "string",
        "minLength": 1,
        "description": "Feature category for grouping (e.g., 'Authentication', 'API', 'UI', 'Testing'). Helps locate related code."
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "description": "Concise feature title (e.g., 'User Login', 'Rate Limiting Middleware'). Used in progress reports."
      },
      "description": {
        "type": "string",
        "minLength": 1,
        "description": "Detailed feature description explaining the expected behavior, user value, and any important context."
        "example": "User can log in with valid credentials"
      },
      "passes": {
        "type": "boolean",
        "description": "Completion status. Set to true only after implementation passes all acceptance criteria and tests."
      },
      "acceptance": {
        "type": "array",
        "minItems": 1,
        "description": "Acceptance criteria list. Each item should be independently verifiable. Write as assertions (e.g., 'Login form validates email format'). Describe creating tests or verifying in browser using dev-browser skill",
        "example": [
          "Login form validates email format",
          "Login form validates password length"
        ],
        "items": {
          "type": "string",
          "minLength": 1,
          "description": "A specific, testable criterion for feature completion"
        }
      },
      "priority": {
        "type": "string",
        "enum": ["critical", "high", "medium", "low"],
        "description": "Feature priority for ordering work. Defaults to 'medium' if not specified."
      },
      "dependencies": {
        "type": "array",
        "description": "Array of feature IDs that must pass before this feature can be started. Prevents working out of order.",
        "items": {
          "type": "string",
          "minLength": 1
        }
      },
      "technicalNotes": {
        "type": "string",
        "description": "Implementation hints: patterns to follow, libraries to use, constraints to respect (e.g., 'Use existing AuthService', 'Must support IE11')."
      },
      "testStrategy": {
        "type": "string",
        "description": "Testing guidance: test types needed (unit/integration/e2e), what to mock, edge cases to cover."
      },
      "suggestedFiles": {
        "type": "array",
        "description": "Paths to files likely needing changes or examination. Glob patterns allowed (e.g., 'src/auth/**/*.ts').",
        "items": {
          "type": "string",
          "minLength": 1
        }
      },
      "outOfScope": {
        "type": "array",
        "description": "Explicit exclusions to prevent over-engineering (e.g., 'No OAuth support yet', 'Skip mobile responsive').",
        "items": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "additionalProperties": false
  }
}
```
---

## Rules

- **Important:** Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
- **For any story with UI changes:** Always include "Verify in browser using dev-browser skill" as acceptance criteria. This ensures visual verification of frontend work.
- **For any story that includes domain logic:** Always include "Verify with unit tests" as acceptance criteria.

## Writing for Junior Developers

The PRD reader may be a junior developer or AI agent. Therefore:

- Be explicit and unambiguous
- Avoid jargon or explain it
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful

---

## Output

- **Format:** JSON (`.json`)
- **Location:** `./plans`
- **Filename:** `prd.md`

Before saving the PRD:

- [ ] Asked clarifying questions
- [ ] Incorporated user's answers
- [ ] PRD items are small, specific and verifiable
- [ ] Saved to `./plans/prd.json`
