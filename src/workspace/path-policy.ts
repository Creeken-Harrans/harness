import path from "node:path";

export type PathPolicyResult = {
  ok: boolean;
  absolutePath: string;
  relativePath: string;
  reason?: string;
  protected?: boolean;
};

const SENSITIVE_SEGMENTS = new Set([".ssh", ".gnupg", ".aws", ".config", ".npmrc"]);
const SENSITIVE_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "known_hosts",
]);

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".cache", "coverage"]);

export function defaultIgnoredDirs(): Set<string> {
  return new Set(IGNORED_DIRS);
}

export class WorkspacePathPolicy {
  readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  resolve(inputPath = "."): PathPolicyResult {
    const absolutePath = path.resolve(this.root, inputPath);
    const relativePath = path.relative(this.root, absolutePath) || ".";
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return {
        ok: false,
        absolutePath,
        relativePath,
        reason: "Path escapes HARNESS_WORKSPACE.",
      };
    }
    const protectedPath = this.isProtected(relativePath);
    return { ok: true, absolutePath, relativePath, protected: protectedPath };
  }

  assertInside(inputPath = "."): PathPolicyResult {
    const result = this.resolve(inputPath);
    if (!result.ok) throw new Error(result.reason ?? "Path is outside workspace.");
    return result;
  }

  assertReadable(inputPath = ".", allowProtected = false): PathPolicyResult {
    const result = this.assertInside(inputPath);
    if (result.protected && !allowProtected) {
      throw new Error(`Refusing to read protected path without explicit opt-in: ${result.relativePath}`);
    }
    return result;
  }

  assertWritable(inputPath = ".", allowProtected = false): PathPolicyResult {
    const result = this.assertInside(inputPath);
    if (result.protected && !allowProtected) {
      throw new Error(`Refusing to write protected path: ${result.relativePath}`);
    }
    return result;
  }

  shouldIgnore(relativePath: string): boolean {
    return relativePath
      .split(path.sep)
      .some((part) => IGNORED_DIRS.has(part));
  }

  isProtected(relativePath: string): boolean {
    const parts = relativePath.split(path.sep).filter(Boolean);
    if (parts.some((part) => SENSITIVE_SEGMENTS.has(part))) return true;
    const base = parts.at(-1) ?? relativePath;
    if (SENSITIVE_BASENAMES.has(base)) return true;
    return /(?:^|[._-])(secret|token|credential|private[_-]?key)(?:[._-]|$)/i.test(base);
  }
}

