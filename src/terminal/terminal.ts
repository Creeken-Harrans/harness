import path from "node:path";
import type { AppConfig } from "../config/config.js";
import { runShellStream, type ShellEvent, type ShellResult } from "./stream.js";

const HARD_DENY_PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+\/(?:\s|$)/,
  /\brm\s+-fr\s+\/(?:\s|$)/,
  /\bmkfs(?:\.[a-z0-9]+)?\b/,
  /\bdd\s+.*\bof=\/dev\//,
  /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*}\s*;/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bhalt\b/,
  /\bchmod\s+-R\s+777\s+\//,
  /\bchown\s+-R\s+[^\s]+\s+\//,
];

export class Terminal {
  constructor(private readonly config: AppConfig) {}

  assertAllowed(command: string): void {
    for (const pattern of HARD_DENY_PATTERNS) {
      if (pattern.test(command)) {
        throw new Error(`Blocked dangerous command by hard safety rule: ${pattern}`);
      }
    }
  }

  runStream(command: string, cwd?: string, timeoutMs?: number): AsyncGenerator<ShellEvent, ShellResult> {
    const actualCwd = path.resolve(cwd ?? this.config.workspace);
    const actualTimeout = timeoutMs ?? this.config.shellTimeoutMs;

    this.assertAllowed(command);

    return runShellStream(command, {
      cwd: actualCwd,
      timeoutMs: actualTimeout,
      maxCaptureChars: this.config.maxToolOutputChars,
    });
  }

  async run(command: string, cwd?: string, timeoutMs?: number): Promise<ShellResult> {
    const stream = this.runStream(command, cwd, timeoutMs);
    let next = await stream.next();
    while (!next.done) {
      next = await stream.next();
    }
    return next.value;
  }
}

export type { ShellEvent, ShellResult };
