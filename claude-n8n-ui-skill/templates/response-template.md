# Response Template (assistant should follow)

## 1) Change summary
- Objective:
- Scope:
- Risk level: Low / Medium / High

## 2) Impact map
- Affected nodes:
- Connection changes:
- Expression/parameter changes:
- Data-shape assumptions:

## 3) n8n UI steps (ordered)
1. Open workflow `<workflow_name>` and duplicate it for backup.
2. Select node `<node_name>`.
3. In panel `<section>`, set `<field>` to `<value>`.
4. ...

**Expected result checkpoint:**
- ...

## 4) Expression updates (old → new)
- Node `<node_name>`, field `<field>`:
  - Old: `...`
  - New: `...`

## 5) Validation checklist
- Execute node `<node_name>` with sample data `<sample>`.
- Confirm output field `<field>` equals `<expected>`.
- Run end-to-end test and verify `<condition>`.

## 6) Rollback plan
- Revert to duplicated backup workflow.
- Or undo specific edits in reverse order:
  1. ...
