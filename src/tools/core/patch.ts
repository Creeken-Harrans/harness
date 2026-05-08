import { runReadOnlyGit } from "../../workspace/git.js";
import { applyUnifiedPatch } from "../../workspace/patch.js";
import type { Tool } from "../tool.js";

export function createPatchTools(): Tool[] {
  return [
    {
      name: "apply_patch",
      risk: "write",
      description: "Apply a unified diff patch inside HARNESS_WORKSPACE. Does not commit. Requires approval according to HARNESS_APPROVAL_MODE.",
      inputSchema: {
        type: "object",
        properties: {
          patch: { type: "string", description: "Unified diff patch text." },
        },
        required: ["patch"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const patch = String(input.patch ?? "");
        if (!patch.trim()) throw new Error("patch must not be empty.");
        const result = applyUnifiedPatch(ctx.workspace, patch);
        const diffStat = runReadOnlyGit(ctx.workspace, ["diff", "--stat"], 20_000);
        return {
          ok: result.ok,
          content: JSON.stringify({ ...result, diffStat: diffStat.stdout || diffStat.stderr }, null, 2),
          data: { ...result, diffStat },
        };
      },
    },
  ];
}

