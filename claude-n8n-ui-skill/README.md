# Claude Skill Pack for n8n Workflow Editing via UI (JSON-In, UI-Steps-Out)

This directory repackages this repository for your target use case:

- You paste **n8n workflow JSON** into Claude (Web or Desktop).
- You ask for a change.
- Claude returns **implementation instructions for n8n Web UI** (not raw JSON patching unless requested).

## Why this structure

The structure below is optimized for prompt consistency, repeatability, and easy reuse across Claude surfaces:

```text
claude-n8n-ui-skill/
├─ README.md
├─ skill/
│  └─ SKILL.md
├─ templates/
│  ├─ request-template.md
│  ├─ response-template.md
│  └─ ui-change-checklist.md
├─ examples/
│  ├─ sample-user-request.md
│  └─ sample-assistant-response.md
└─ research/
   └─ references.md
```

## Implementation (Claude Web)

1. Create a dedicated Claude Project (e.g., `n8n Workflow Builder`).
2. Add the following files as project knowledge:
   - `skill/SKILL.md`
   - `templates/response-template.md`
   - `templates/ui-change-checklist.md`
3. Pin a Project instruction derived from `templates/request-template.md` (or paste it each session).
4. When working: paste the workflow JSON + change request.
5. Ask Claude to answer strictly in the response format from `templates/response-template.md`.

## Implementation (Claude Desktop)

1. Keep this directory locally and open the files as reference context when composing prompts.
2. Start each thread by pasting:
   - `skill/SKILL.md` (or a shortened version),
   - your workflow JSON,
   - and your change goal.
3. Reuse `templates/request-template.md` to avoid drift.
4. Verify output with `templates/ui-change-checklist.md` before applying changes in n8n UI.

## Recommended operating pattern

- **Source of truth:** workflow JSON from n8n export.
- **Execution medium:** n8n UI click-steps.
- **Validation:** run node-level test executions in n8n after each change block.
- **Safety:** ask Claude for rollback instructions before implementing high-impact edits.

## Notes

- This repo originally contains an n8n community node codebase. This folder adds a dedicated, portable skill layer for your Claude-assisted workflow editing process.
- External reference links used for design choices are listed in `research/references.md`.
