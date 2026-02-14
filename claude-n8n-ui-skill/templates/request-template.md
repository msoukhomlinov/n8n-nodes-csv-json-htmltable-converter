# Request Template (copy into Claude)

You are helping me edit an n8n workflow via the n8n web UI.
I will provide workflow JSON and I want UI implementation steps, not only JSON edits.

## Goal
<describe desired change>

## Constraints
- <example: do not change existing node IDs>
- <example: preserve current credentials>
- <example: add minimum number of nodes>

## Workflow JSON
```json
<paste workflow json>
```

## Required response format
1. Change summary
2. Impact map (nodes, connections, expressions)
3. Ordered n8n UI steps (click-by-click)
4. Expression updates (old -> new)
5. Validation checklist (node-level tests)
6. Rollback plan
