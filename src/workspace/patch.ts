import { spawnSync } from "node:child_process";
import type { Workspace } from "./workspace.js";

function pathsFromPatch(patch: string): string[] {
  const paths: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      const raw = line.slice(4).trim();
      if (raw === "/dev/null") continue;
      paths.push(raw.replace(/^[ab]\//, ""));
    }
  }
  return [...new Set(paths)];
}

export function applyUnifiedPatch(workspace: Workspace, patch: string): { ok: boolean; stdout: string; stderr: string; changedPaths: string[] } {
  const changedPaths = pathsFromPatch(patch);
  for (const changedPath of changedPaths) {
    workspace.policy.assertWritable(changedPath, false);
  }

  const check = spawnSync("git", ["apply", "--check", "-"], {
    cwd: workspace.root,
    input: patch,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (check.status !== 0) {
    return { ok: false, stdout: check.stdout ?? "", stderr: check.stderr ?? "", changedPaths };
  }

  const apply = spawnSync("git", ["apply", "-"], {
    cwd: workspace.root,
    input: patch,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return {
    ok: apply.status === 0,
    stdout: apply.stdout ?? "",
    stderr: apply.stderr ?? "",
    changedPaths,
  };
}

