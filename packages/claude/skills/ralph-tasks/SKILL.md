---
name: ralph-tasks
description: "Convert PRDs in markdown files or text to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
---

# Ralph PRD Converter

Converts existing PRDs to the prd.json format that Ralph uses for autonomous execution.

---

## The Job

**Goal**: Generate a prd.json files where each item is small and specific.

**CRITICAL**: This is one of the most important phases. DO NOT SKIP.

**Important:** Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
**For any story with UI changes:** Always include "Verify in browser using dev-browser skill" as acceptance criteria. This ensures visual verification of frontend work.
**For any story that includes domain logic:** Always include "Verify with unit tests" as acceptance criteria.

### Tracer Bullets

When building features, build a tiny, end-to-end slice of the feature first, seek feedback, then expand out from there.

Tracer bullets comes from the Pragmatic Programmer. When building systems, you want to write code that gets you feedback as quickly as possible. Tracer bullets are small slices of functionality that go through all layers of the system, allowing you to test and validate your approach early. This helps in identifying potential issues and ensures that the overall architecture is sound before investing significant time in development.


---

## Output Format

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

Before writing prd.json, verify:

- [ ] Asked clarifying questions
- [ ] Incorporated user's answers
- [ ] PRD item is completable in one iteration (small enough)
- [ ] For new features create a **Tracer Bullet** first then build a **Minimum Viable Product** (MVP)
- [ ] UI stories have "Verify in browser using dev-browser skill" as criterion
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] Saved to `./plans/prd.json`
