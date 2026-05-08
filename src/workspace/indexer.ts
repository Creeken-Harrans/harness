import fs from "node:fs";
import path from "node:path";
import type { Workspace } from "./workspace.js";

export type WorkspaceIndexSummary = {
  root: string;
  filesScanned: number;
  topLevel: string[];
};

export function summarizeWorkspace(workspace: Workspace): WorkspaceIndexSummary {
  const topLevel = fs
    .readdirSync(workspace.root, { withFileTypes: true })
    .filter((entry) => !workspace.policy.shouldIgnore(entry.name))
    .map((entry) => entry.isDirectory() ? `${entry.name}/` : entry.name)
    .sort();
  let filesScanned = 0;
  for (const name of topLevel) {
    const absolute = path.join(workspace.root, name.replace(/\/$/, ""));
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) filesScanned += 1;
  }
  return { root: workspace.root, filesScanned, topLevel };
}

