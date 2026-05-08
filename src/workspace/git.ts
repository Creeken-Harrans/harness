import { spawnSync } from "node:child_process";
import type { Workspace } from "./workspace.js";

export type GitCommandResult = {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

export function runReadOnlyGit(workspace: Workspace, args: string[], maxChars = 20_000): GitCommandResult {
  const allowed = new Set(["status", "diff", "log", "show", "branch", "rev-parse"]);
  const subcommand = args[0] ?? "";
  if (!allowed.has(subcommand)) {
    throw new Error(`Refusing non-read-only git command: git ${args.join(" ")}`);
  }
  const result = spawnSync("git", args, {
    cwd: workspace.root,
    encoding: "utf8",
    maxBuffer: Math.max(maxChars * 4, 1024 * 1024),
  });
  const stdout = (result.stdout ?? "").slice(0, maxChars);
  const stderr = (result.stderr ?? "").slice(0, maxChars);
  return {
    ok: result.status === 0,
    command: `git ${args.join(" ")}`,
    stdout,
    stderr,
    exitCode: result.status,
  };
}

