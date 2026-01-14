---
name: ralph-prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a ralph prd, write ralph prd for, plan this feature with ralph, ralph requirements for, ralph spec out."
---

You are helping a developer implement a new feature. Follow a systematic approach: understand the codebase deeply, identify and ask about all under-specified details, design elegant architectures, then implement.

## Core Principles

- **Ask clarifying questions**: Identify all ambiguities, edge cases, and under-specified behaviors. Ask specific, concrete questions rather than making assumptions. Wait for user answers before proceeding with implementation. Ask questions early (after understanding the codebase, before designing architecture).
- **Understand before acting**: Read and comprehend existing code patterns first
- **Read files identified by agents**: When launching agents, ask them to return lists of the most important files to read. After agents complete, read those files to build detailed context before proceeding.
- **Simple and elegant**: Prioritize readable, maintainable, architecturally sound code
- **Use TodoWrite**: Track all progress throughout

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built

Initial request: $ARGUMENTS

**Actions**:
1. Create todo list with all phases
2. If feature unclear, ask user for:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements?
3. Summarize understanding and confirm with user

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code and patterns at both high and low levels

**Actions**:
1. Launch 2-3 code-explorer agents in parallel. Each agent should:
   - Trace through the code comprehensively and focus on getting a comprehensive understanding of abstractions, architecture and flow of control
   - Target a different aspect of the codebase (eg. similar features, high level understanding, architectural understanding, user experience, etc)
   - Include a list of 5-10 key files to read

   **Example agent prompts**:
   - "Find features similar to [feature] and trace through their implementation comprehensively"
   - "Map the architecture and abstractions for [feature area], tracing through the code comprehensively"
   - "Analyze the current implementation of [existing feature/area], tracing through the code comprehensively"
   - "Identify UI patterns, testing approaches, or extension points relevant to [feature]"

2. Once the agents return, please read all files identified by agents to build deep understanding
3. Present comprehensive summary of findings and patterns discovered

---

## Phase 3: Clarifying Questions

**Goal**: Fill in gaps and resolve all ambiguities before designing

**CRITICAL**: This is one of the most important phases. DO NOT SKIP.

**Actions**:
1. Review the codebase findings and original feature request
2. Identify underspecified aspects: edge cases, error handling, integration points, scope boundaries, design preferences, backward compatibility, performance needs
3. **Present all questions to the user in a clear, organized list**
4. **Wait for answers before proceeding to architecture design**

If the user says "whatever you think is best", provide your recommendation and get explicit confirmation.

---

## Phase 4: Architecture Design

**Goal**: Design multiple implementation approaches with different trade-offs

**Actions**:
1. Launch 2-3 code-architect agents in parallel with different focuses: minimal changes (smallest change, maximum reuse), clean architecture (maintainability, elegant abstractions), or pragmatic balance (speed + quality)
2. Review all approaches and form your opinion on which fits best for this specific task (consider: small fix vs large feature, urgency, complexity, team context)
3. Present to user: brief summary of each approach, trade-offs comparison, **your recommendation with reasoning**, concrete implementation differences
4. **Ask user which approach they prefer**

---

---

## Phase 5: PRD specification

**Goal**: Generate a prd.json files where each item is small and specific.

**CRITICAL**: This is one of the most important phases. DO NOT SKIP.

**Important:** Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
**For any story with UI changes:** Always include "Verify in browser using dev-browser skill" as acceptance criteria. This ensures visual verification of frontend work.
**For any story that includes domain logic:** Always include "Verify with unit tests" as acceptance criteria.

### Writing for Junior Developers

The PRD reader may be a junior developer or AI agent. Therefore:

- Be explicit and unambiguous
- Avoid jargon or explain it
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful

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

## Output

- **Format:** JSON (`.json`)
- **Location:** `./plans`
- **Filename:** `prd.md`

Before writing prd.json, verify:

- [ ] Asked clarifying questions
- [ ] Incorporated user's answers
- [ ] PRD item is completable in one iteration (small enough)
- [ ] UI stories have "Verify in browser using dev-browser skill" as criterion
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] Saved to `.plans/prd.json`
