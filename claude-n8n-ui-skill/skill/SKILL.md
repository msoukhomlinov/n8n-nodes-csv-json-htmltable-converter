# SKILL: n8n JSON Analysis → n8n UI Change Instructions

## Purpose
Transform user-supplied n8n workflow JSON into precise, low-risk instructions that the user implements manually in the n8n editor UI.

## Operating constraints
1. Treat workflow JSON as read-first context; do not assume hidden nodes or credentials.
2. Prefer incremental UI edits over full rebuild guidance.
3. Provide node-by-node instructions using visible labels and menu paths.
4. Always include validation steps after each major change.
5. Explicitly flag uncertainty when JSON lacks enough detail.

## Input contract
User should provide:
- Workflow JSON (full preferred; partial accepted with caveats)
- Goal statement (what should change)
- Optional constraints (no new nodes, preserve IDs, keep credential names, etc.)

## Output contract
Always structure the response as:
1. **Change summary**
2. **Impact map** (affected nodes, connections, expressions)
3. **n8n UI steps** (ordered, click-by-click)
4. **Expression updates** (old → new)
5. **Validation checklist**
6. **Rollback plan**

## n8n-specific guidance
- Refer to nodes by `name` from JSON and include type when helpful.
- For connection changes, mention both source and destination node names.
- For expressions, preserve `{{$...}}` syntax and mention test data assumptions.
- If credentials are involved, never invent secrets; instruct user where to select existing credentials.
- For branching logic (`IF`, `Switch`, merge paths), describe expected execution paths with sample payloads.

## Safety checks before final answer
- No destructive step without backup/export reminder.
- No credential value fabrication.
- No instruction that depends on non-existent nodes unless creation is explicitly included.
- No silent schema assumptions.

## Preferred response style
- Use concise numbered steps.
- Keep one action per step.
- Include "Expected result" checkpoints every 3–5 steps.
