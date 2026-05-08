import type { Tool } from "../tool.js";
import { runReadOnlyGit } from "../../workspace/git.js";

function maxChars(input: Record<string, unknown>, fallback = 20_000): number {
  return typeof input.maxChars === "number" ? Math.min(Math.max(Math.floor(input.maxChars), 1000), 80_000) : fallback;
}

export function createGitTools(): Tool[] {
  return [
    {
      name: "git_status",
      risk: "read",
      description: "Run git status --short --branch in HARNESS_WORKSPACE.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run(_input, ctx) {
        const result = runReadOnlyGit(ctx.workspace, ["status", "--short", "--branch"]);
        return { ok: result.ok, content: result.stdout || result.stderr, data: result };
      },
    },
    {
      name: "git_diff",
      risk: "read",
      description: "Show git diff in HARNESS_WORKSPACE. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          staged: { type: "boolean" },
          maxChars: { type: "number" },
        },
        additionalProperties: false,
      },
      run(input, ctx) {
        const args = input.staged === true ? ["diff", "--cached"] : ["diff"];
        const result = runReadOnlyGit(ctx.workspace, args, maxChars(input));
        return { ok: result.ok, content: result.stdout || result.stderr || "(no diff)", data: result };
      },
    },
    {
      name: "git_log",
      risk: "read",
      description: "Show recent git commit log. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
      run(input, ctx) {
        const limit = typeof input.limit === "number" ? Math.min(Math.max(Math.floor(input.limit), 1), 50) : 10;
        const result = runReadOnlyGit(ctx.workspace, ["log", "-" + limit, "--oneline", "--decorate"]);
        return { ok: result.ok, content: result.stdout || result.stderr, data: result };
      },
    },
    {
      name: "git_show",
      risk: "read",
      description: "Show a git object or commit. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          ref: { type: "string", description: "Commit/ref/pathspec accepted by git show." },
          maxChars: { type: "number" },
        },
        required: ["ref"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const ref = String(input.ref ?? "").trim();
        if (!ref) throw new Error("ref is required.");
        const result = runReadOnlyGit(ctx.workspace, ["show", "--no-ext-diff", "--stat", "--patch", ref], maxChars(input));
        return { ok: result.ok, content: result.stdout || result.stderr, data: result };
      },
    },
    {
      name: "git_branch",
      risk: "read",
      description: "Show current git branch information. Read-only.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run(_input, ctx) {
        const result = runReadOnlyGit(ctx.workspace, ["branch", "--show-current"]);
        return { ok: result.ok, content: result.stdout || result.stderr, data: result };
      },
    },
  ];
}

