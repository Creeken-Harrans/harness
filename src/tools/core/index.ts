import type { Tool } from "../tool.js";
import { createFileTools } from "./file.js";
import { createGitTools } from "./git.js";
import { createMemoryTools } from "./memory.js";
import { createNotesTools } from "./notes.js";
import { createPatchTools } from "./patch.js";
import { createSessionTools } from "./session.js";
import { createShellTools } from "./shell.js";

export function createPhase2CoreTools(): Tool[] {
  return [
    ...createMemoryTools(),
    ...createSessionTools(),
    ...createShellTools(),
    ...createFileTools(),
    ...createGitTools(),
    ...createPatchTools(),
    ...createNotesTools(),
  ];
}
