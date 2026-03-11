## 1) Change summary
- Objective: prevent records without an email from reaching HubSpot create/update node.
- Scope: add one IF node and reroute one branch.
- Risk level: Low.

## 2) Impact map
- Affected nodes: `Normalize Contact`, `HubSpot Upsert`.
- Connection changes: insert `IF: Has Email` between these nodes.
- Expression changes: condition uses `{{$json.email}}` existence check.

## 3) n8n UI steps (ordered)
1. Duplicate workflow as `...-backup`.
2. Add an **IF** node named `Has Email` after `Normalize Contact`.
3. In IF node, add condition: String `{{$json.email}}` "is not empty".
4. Connect `Normalize Contact` → `Has Email`.
5. Connect `Has Email` **true** output → `HubSpot Upsert`.
6. Connect `Has Email` **false** output → `Missing Email Log` (or temporary NoOp).

Expected result checkpoint:
- Records with email flow to HubSpot; missing-email records are diverted.

## 4) Expression updates (old → new)
- No existing expression modified; new condition added in `Has Email`.

## 5) Validation checklist
- Execute `Normalize Contact` with one valid + one missing-email item.
- Execute `Has Email`; confirm split across true/false outputs.
- Execute from trigger; confirm HubSpot only receives valid records.

## 6) Rollback plan
- Remove `Has Email` node and restore original direct connection.
- Or reactivate backup workflow copy.
