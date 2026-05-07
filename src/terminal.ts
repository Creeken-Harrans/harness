import { spawn } from "node:child_process";
import path from "node:path";
import type { AppConfig } from "./config.js";

export type ShellResult = {
  command: string;
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
};

const HARD_DENY_PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+\/(?:\s|$)/,
  /\brm\s+-fr\s+\/(?:\s|$)/,
  /\bmkfs(?:\.[a-z0-9]+)?\b/,
  /\bdd\s+.*\bof=\/dev\//,
  /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*}\s*;/, // fork bomb
  /\bshutdown\b/,
  /\breboot\b/,
  /\bhalt\b/,
  /\bchmod\s+-R\s+777\s+\//,
  /\bchown\s+-R\s+[^\s]+\s+\//,
];

function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const head = Math.floor(maxChars * 0.65);
  const tail = Math.max(0, maxChars - head - 80);
  return `${text.slice(0, head)}\n\n...[truncated ${text.length - maxChars} chars]...\n\n${text.slice(-tail)}`;
}

export class Terminal {
  constructor(private readonly config: AppConfig) {}

  assertAllowed(command: string): void {
    for (const pattern of HARD_DENY_PATTERNS) {
      if (pattern.test(command)) {
        throw new Error(`Blocked dangerous command by hard safety rule: ${pattern}`);
      }
    }
  }

  async run(command: string, cwd?: string, timeoutMs?: number): Promise<ShellResult> {
    const started = Date.now();
    const actualCwd = path.resolve(cwd ?? this.config.workspace);
    const actualTimeout = timeoutMs ?? this.config.shellTimeoutMs;

    this.assertAllowed(command);

    return await new Promise<ShellResult>((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const child = spawn("bash", ["-lc", command], {
        cwd: actualCwd,
        env: process.env,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 1000).unref();
      }, actualTimeout);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          command,
          cwd: actualCwd,
          exitCode: 1,
          signal: null,
          stdout: "",
          stderr: err.message,
          durationMs: Date.now() - started,
          timedOut,
        });
      });

      child.on("close", (exitCode, signal) => {
        clearTimeout(timer);
        const maxEach = Math.floor(this.config.maxToolOutputChars / 2);
        resolve({
          command,
          cwd: actualCwd,
          exitCode,
          signal,
          stdout: truncateMiddle(stdout, maxEach),
          stderr: truncateMiddle(stderr, maxEach),
          durationMs: Date.now() - started,
          timedOut,
        });
      });
    });
  }
}
