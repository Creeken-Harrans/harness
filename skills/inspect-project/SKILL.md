# inspect-project

## Use When

Use this skill when the agent must understand the local harness repository before editing.

## Workflow

1. Read README.md, package.json, tsconfig.json, SOUL.md, and docs.
2. Inspect src/main.ts, src/cli, src/runtime, src/tools, src/context, and src/deepseek.
3. Check git status before editing.
4. Run npm run build after structural changes.

## Recommended Tools

- read_file
- list_dir
- grep
- glob
- git_status
- git_diff

## Do Not

- Do not rely on remote GitHub pages over local files.
- Do not delete compatibility re-exports without a migration.

## Success Standard

The agent can explain the runtime entry, tool path, context builder, and safety boundary with local file references.

