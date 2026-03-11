# UI Change Checklist (for user)

## Before editing
- [ ] Export current workflow JSON backup.
- [ ] Confirm required credentials already exist in environment.
- [ ] Confirm target workflow version/branch.

## During editing
- [ ] Apply changes in small batches (1 logical block at a time).
- [ ] Run node-level execution after each batch.
- [ ] Verify expression previews resolve without errors.
- [ ] Verify connection lines match intended routing.

## Before activation
- [ ] Run at least one realistic end-to-end test execution.
- [ ] Check error workflow path/notifications still work.
- [ ] Re-check trigger settings (schedule/webhook/event).
- [ ] Save and re-open workflow to ensure persistence.

## After activation
- [ ] Monitor first production runs.
- [ ] Keep rollback workflow copy until stable window passes.
