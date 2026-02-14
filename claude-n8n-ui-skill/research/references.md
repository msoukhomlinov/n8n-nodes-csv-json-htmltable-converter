# Research log and design basis

This skill-pack structure was designed from publicly available documentation that could be fetched from this environment.

## Sources reviewed

1. n8n Docs repository root (scope and maintenance context):
   - https://raw.githubusercontent.com/n8n-io/n8n-docs/main/README.md
2. n8n workflow export/import behavior:
   - https://raw.githubusercontent.com/n8n-io/n8n-docs/main/docs/workflows/export-import.md
   - Key finding: workflows are saved in JSON and can be imported/exported via Editor UI.
3. n8n workflow creation/execution/publish lifecycle:
   - https://raw.githubusercontent.com/n8n-io/n8n-docs/main/docs/workflows/create.md
   - Key finding: build on canvas, execute manually during testing, publish for automatic runs.
4. n8n expression model:
   - https://raw.githubusercontent.com/n8n-io/n8n-docs/main/docs/code/expressions.md
   - Key finding: expression syntax (`{{ ... }}`), variable selector, and dynamic parameter mapping are central.
5. n8n data mapping concept:
   - https://raw.githubusercontent.com/n8n-io/n8n-docs/main/docs/data/data-mapping/index.md
   - Key finding: mapping prior-node data is a core workflow editing task.
6. Anthropic Claude Code repository README (prompt/workflow discipline inspiration):
   - https://raw.githubusercontent.com/anthropics/claude-code/main/README.md
   - Key finding: strong emphasis on reusable command structures and repo-local guidance files.

## Environment limitations encountered

- Direct fetches from some docs websites (for example `docs.n8n.io` and some Anthropic-hosted web pages) returned HTTP 403 or empty responses in this execution environment.
- To ensure accuracy despite that limitation, this plan relies on official source-of-truth markdown from public GitHub repositories wherever possible.

## Resulting design decisions

- Built a **JSON-in/UI-steps-out** skill with strict response schema.
- Added reusable templates to reduce prompt drift between Claude Web and Claude Desktop sessions.
- Added a user-side operational checklist for safe rollout and rollback in n8n UI.
