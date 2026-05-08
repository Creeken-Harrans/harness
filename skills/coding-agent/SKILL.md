# coding-agent

## Use When

Use this skill for implementation tasks in the harness repository.

## Workflow

1. Inspect package.json, tsconfig.json, README, and relevant source modules.
2. Check git status and current diff.
3. Prefer workspace-safe file/git/patch tools.
4. Make small, reversible edits.
5. Run npm run build and relevant evals.
6. Summarize changed files, behavior, verification, and residual risks.

## Recommended Tools

- git_status
- git_diff
- read_file
- edit_file
- apply_patch
- shell_exec_stream

## Do Not

- Do not auto-commit.
- Do not run destructive git commands.
- Do not introduce non-DeepSeek model providers.

## Success Standard

The project builds, core behavior is usable, and unfinished advanced work is documented honestly.

