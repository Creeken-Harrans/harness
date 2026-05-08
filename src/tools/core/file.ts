import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../tool.js";

const TEXT_EXT_ALLOW = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".yml", ".yaml", ".toml", ".css", ".html", ".sh",
]);

function asPath(input: Record<string, unknown>, key = "path"): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new Error("Missing required path argument: " + key);
  return value;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function toRegex(pattern: string, regex = false): RegExp {
  return regex ? new RegExp(pattern, "i") : new RegExp(escapeRegexLiteral(pattern), "i");
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split(/([*][*]|[*]|[?])/g)
    .map((part) => {
      if (part === "**") return ".*";
      if (part === "*") return "[^/]*";
      if (part === "?") return "[^/]";
      return escapeRegexLiteral(part);
    })
    .join("");
  return new RegExp("^" + escaped + "$");
}

function walk(root: string, shouldIgnore: (relativePath: string) => boolean, maxFiles: number): string[] {
  const out: string[] = [];
  const visit = (absolute: string, relative: string): void => {
    if (out.length >= maxFiles || shouldIgnore(relative)) return;
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute)) {
        visit(path.join(absolute, entry), relative ? path.posix.join(relative, entry) : entry);
        if (out.length >= maxFiles) break;
      }
    } else if (stat.isFile()) {
      out.push(relative);
    }
  };
  visit(root, "");
  return out;
}

function looksTextual(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (TEXT_EXT_ALLOW.has(ext)) return true;
  if (path.basename(filePath) === ".env.example") return true;
  return !ext && !path.basename(filePath).includes(".");
}

export function createFileTools(): Tool[] {
  return [
    {
      name: "read_file",
      risk: "read",
      description: "Read a UTF-8 text file inside HARNESS_WORKSPACE. Protected secret paths are denied by default.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          maxChars: { type: "number", description: "Maximum characters to return. Default 20000." },
        },
        required: ["path"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const maxChars = typeof input.maxChars === "number" ? Math.max(1, Math.floor(input.maxChars)) : 20_000;
        const result = ctx.workspace.files.readText(asPath(input), maxChars);
        return {
          ok: true,
          content: result.content,
          data: result,
          truncated: result.truncated,
          metadata: { path: result.relativePath, bytes: result.bytes },
        };
      },
    },
    {
      name: "write_file",
      risk: "write",
      description: "Write a UTF-8 text file inside HARNESS_WORKSPACE. Requires approval according to HARNESS_APPROVAL_MODE.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
      run(input, ctx) {
        if (typeof input.content !== "string") throw new Error("content must be a string.");
        const result = ctx.workspace.files.writeText(asPath(input), input.content);
        return { ok: true, content: "Wrote " + result.relativePath + " (" + result.bytes + " bytes)", data: result };
      },
    },
    {
      name: "edit_file",
      risk: "write",
      description: "Replace text in a UTF-8 file inside HARNESS_WORKSPACE. This is diff-friendly for small local edits.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          oldText: { type: "string" },
          newText: { type: "string" },
          replaceAll: { type: "boolean" },
        },
        required: ["path", "oldText", "newText"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const filePath = asPath(input);
        const oldText = String(input.oldText ?? "");
        const newText = String(input.newText ?? "");
        if (!oldText) throw new Error("oldText must not be empty.");
        const current = ctx.workspace.files.readText(filePath, Number.MAX_SAFE_INTEGER);
        const count = current.content.split(oldText).length - 1;
        if (count === 0) throw new Error("oldText not found.");
        const replaceAll = input.replaceAll === true;
        const updated = replaceAll ? current.content.split(oldText).join(newText) : current.content.replace(oldText, newText);
        const written = ctx.workspace.files.writeText(filePath, updated);
        const replacements = replaceAll ? count : 1;
        return {
          ok: true,
          content: "Edited " + written.relativePath + "; replacements=" + replacements,
          data: { ...written, replacements },
        };
      },
    },
    {
      name: "list_dir",
      risk: "read",
      description: "List a directory inside HARNESS_WORKSPACE.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path. Default ." },
        },
        additionalProperties: false,
      },
      run(input, ctx) {
        const result = ctx.workspace.files.listDir(typeof input.path === "string" ? input.path : ".");
        return { ok: true, content: JSON.stringify(result, null, 2), data: { entries: result } };
      },
    },
    {
      name: "glob",
      risk: "read",
      description: "Find workspace files matching a simple glob. Ignores generated directories.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob such as src/**/*.ts." },
          maxResults: { type: "number" },
        },
        required: ["pattern"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const pattern = String(input.pattern ?? "").trim();
        const maxResults = typeof input.maxResults === "number" ? Math.min(Math.max(Math.floor(input.maxResults), 1), 500) : 100;
        const re = globToRegExp(pattern);
        const files = walk(ctx.workspace.root, (rel) => ctx.workspace.policy.shouldIgnore(rel), 5000)
          .filter((rel) => re.test(rel))
          .slice(0, maxResults);
        return { ok: true, content: JSON.stringify(files, null, 2), data: { files, truncated: files.length >= maxResults } };
      },
    },
    {
      name: "grep",
      risk: "read",
      description: "Search text files inside HARNESS_WORKSPACE. Ignores large generated directories.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          path: { type: "string", description: "Optional subdirectory. Default ." },
          regex: { type: "boolean" },
          maxResults: { type: "number" },
        },
        required: ["query"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const query = String(input.query ?? "").trim();
        if (!query) throw new Error("query must not be empty.");
        const base = ctx.workspace.policy.assertReadable(typeof input.path === "string" ? input.path : ".");
        const maxResults = typeof input.maxResults === "number" ? Math.min(Math.max(Math.floor(input.maxResults), 1), 200) : 50;
        const pattern = toRegex(query, input.regex === true);
        const files = walk(base.absolutePath, (rel) => ctx.workspace.policy.shouldIgnore(path.posix.join(base.relativePath, rel)), 5000);
        const matches: Array<{ path: string; line: number; text: string }> = [];
        for (const rel of files) {
          const displayPath = path.posix.join(base.relativePath === "." ? "" : base.relativePath, rel);
          if (!looksTextual(displayPath)) continue;
          const absolute = path.join(base.absolutePath, rel);
          if (fs.statSync(absolute).size > 1_000_000) continue;
          const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              matches.push({ path: displayPath, line: i + 1, text: lines[i].slice(0, 500) });
              if (matches.length >= maxResults) break;
            }
          }
          if (matches.length >= maxResults) break;
        }
        return { ok: true, content: JSON.stringify(matches, null, 2), data: { matches, truncated: matches.length >= maxResults } };
      },
    },
  ];
}

