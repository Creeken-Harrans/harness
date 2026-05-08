import fs from "node:fs";
import path from "node:path";
import type { Stats } from "node:fs";
import { WorkspacePathPolicy } from "./path-policy.js";

export type ReadTextResult = {
  path: string;
  relativePath: string;
  content: string;
  bytes: number;
  truncated: boolean;
};

export class WorkspaceFileStore {
  constructor(private readonly policy: WorkspacePathPolicy) {}

  readText(inputPath: string, maxChars = 20_000, allowProtected = false): ReadTextResult {
    const resolved = this.policy.assertReadable(inputPath, allowProtected);
    const raw = fs.readFileSync(resolved.absolutePath, "utf8");
    const content = raw.length > maxChars ? raw.slice(0, maxChars) : raw;
    return {
      path: resolved.absolutePath,
      relativePath: resolved.relativePath,
      content,
      bytes: Buffer.byteLength(raw),
      truncated: raw.length > maxChars,
    };
  }

  writeText(inputPath: string, content: string, allowProtected = false): { path: string; relativePath: string; bytes: number } {
    const resolved = this.policy.assertWritable(inputPath, allowProtected);
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(resolved.absolutePath, content);
    return {
      path: resolved.absolutePath,
      relativePath: resolved.relativePath,
      bytes: Buffer.byteLength(content),
    };
  }

  listDir(inputPath = "."): Array<{ name: string; path: string; type: "file" | "dir" | "other"; size: number }> {
    const resolved = this.policy.assertReadable(inputPath, false);
    return fs.readdirSync(resolved.absolutePath, { withFileTypes: true }).map((entry) => {
      const absolute = path.join(resolved.absolutePath, entry.name);
      const stat = fs.statSync(absolute);
      return {
        name: entry.name,
        path: path.join(resolved.relativePath === "." ? "" : resolved.relativePath, entry.name),
        type: entry.isDirectory() ? "dir" : entry.isFile() ? "file" : "other",
        size: stat.size,
      };
    });
  }

  exists(inputPath: string): boolean {
    const resolved = this.policy.resolve(inputPath);
    return resolved.ok && fs.existsSync(resolved.absolutePath);
  }

  stat(inputPath: string): Stats {
    const resolved = this.policy.assertReadable(inputPath, false);
    return fs.statSync(resolved.absolutePath);
  }
}

