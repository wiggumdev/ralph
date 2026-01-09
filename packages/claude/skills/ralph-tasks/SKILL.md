---
name: ralph-tasks
description: "Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
---

# Ralph PRD Converter

Converts existing PRDs to the prd.json format that Ralph uses for autonomous execution.

---

## The Job

Take a PRD (markdown file or text) and convert it to `.plans/prd.json`.

---

## Output Format

```json
[
    {
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "npm run typecheck passes"
      ],
      "passes": false,
    }
]
```

---

## Story Size: The #1 Rule

**Each story must be completable in ONE Ralph iteration (~one context window).**

Ralph spawns a fresh instance per iteration with no memory of previous work. If a story is too big, the LLM runs out of context before finishing and produces broken code.

### Right-sized stories:
- Add a database column + migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" → Split into: schema, queries, UI components, filters
- "Add authentication" → Split into: schema, middleware, login UI, session handling
- "Refactor the API" → Split into one story per endpoint or pattern

**Rule of thumb:** If you can't describe the change in 2-3 sentences, it's too big.

---

## Acceptance Criteria: Must Be Verifiable

Each criterion must be something Ralph can CHECK, not something vague.

### Good criteria (verifiable):
- "Add `investorType` column to investor table with default 'cold'"
- "Filter dropdown has options: All, Cold, Friend"
- "Clicking toggle shows confirmation dialog"
- "npm run typecheck passes"
- "npm test passes"

### Bad criteria (vague):
- ❌ "Works correctly"
- ❌ "User can do X easily"
- ❌ "Good UX"
- ❌ "Handles edge cases"

### Always include as final criterion:
```
"npm run typecheck passes"
```

For stories with testable logic, also include:
```
"npm test passes"
```

### For stories that change UI, also include:
```
"Verify in browser using dev-browser skill"
```

Frontend stories are NOT complete until visually verified. Ralph will use the dev-browser skill to navigate to the page, interact with the UI, and confirm changes work.

---

## Conversion Rules

1. **All stories**: `passes: false`

---

## Splitting Large PRDs

If a PRD has big features, split them:

**Original:**
> "Add friends outreach track with different messaging"

**Split into:**
1. Add investorType field to database
2. Add type toggle to investor list UI
3. Create friend-specific phase progression logic
4. Create friend message templates
5. Wire up task generation for friends
6. Add filter by type
7. Update new investor form
8. Update dashboard counts

Each is one focused change that can be completed and verified independently.

---

## Example

**Input PRD:**
```markdown
# Friends Outreach

Add ability to mark investors as "friends" for warm outreach.

## Requirements
- Toggle between cold/friend on investor list
- Friends get shorter follow-up sequence (3 instead of 5)
- Different message template asking for deck feedback
- Filter list by type
```

**Output prd.json:**
```json
{
  "project": "Untangle",
  "branchName": "ralph/friends-outreach",
  "description": "Friends Outreach Track - Warm outreach for deck feedback",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add investorType field to investor table",
      "description": "As a developer, I need to categorize investors as 'cold' or 'friend'.",
      "acceptanceCriteria": [
        "Add investorType column: 'cold' | 'friend' (default 'cold')",
        "Generate and run migration successfully",
        "npm run typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-002",
      "title": "Add type toggle to investor list rows",
      "description": "As Ryan, I want to toggle investor type directly from the list.",
      "acceptanceCriteria": [
        "Each row has Cold | Friend toggle",
        "Switching shows confirmation: 'Delete tasks and regenerate?'",
        "On confirm: updates type, deletes tasks, regenerates",
        "npm run typecheck passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 2,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-003",
      "title": "Create friend-specific phase progression",
      "description": "As a developer, friends should use 3 follow-ups instead of 5.",
      "acceptanceCriteria": [
        "Friends: initial → followup_1 → followup_2 → followup_3 → final",
        "Cold: keeps all 5 follow-ups",
        "getNextPhase respects investorType",
        "npm run typecheck passes"
      ],
      "priority": 3,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-004",
      "title": "Create friend message templates",
      "description": "As Ryan, friends should get deck feedback request, not cold pitch.",
      "acceptanceCriteria": [
        "Initial message asks for deck feedback with link and password",
        "4 channel variations with same meaning, slight phrasing differences",
        "Follow-ups are gentle nudges",
        "npm run typecheck passes"
      ],
      "priority": 4,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-005",
      "title": "Filter investors by type",
      "description": "As Ryan, I want to filter the list to see just friends or cold.",
      "acceptanceCriteria": [
        "Filter dropdown: All | Cold | Friend",
        "Filter persists in URL params",
        "npm run typecheck passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 5,
      "passes": false,
      "notes": ""
    }
  ]
```

---

## Output Location

Write to: `.plans/prd.json`

---

## Checklist Before Saving

Before writing prd.json, verify:

- [ ] Each story is completable in one iteration (small enough)
- [ ] UI stories have "Verify in browser using dev-browser skill" as criterion
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] No story depends on a later story
