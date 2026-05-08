# fix-ts-errors

## Use When

Use this skill when npm run build or npm run typecheck fails.

## Workflow

1. Run npm run build and capture the first TypeScript error group.
2. Fix root causes with minimal edits.
3. Re-run npm run build.
4. Repeat until build passes.

## Recommended Tools

- shell_exec_stream
- read_file
- edit_file
- git_diff

## Do Not

- Do not loosen tsconfig strictness to hide errors.
- Do not add any unless the type is truly unknown and bounded.
- Do not rewrite unrelated modules.

## Success Standard

npm run build passes and git diff contains only focused fixes.

