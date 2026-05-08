import { spawn } from "node:child_process";
import path from "node:path";

export type ShellResult = {
  command: string;
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
  durationMs: number;
  timedOut: boolean;
};

export type ShellEvent =
  | {
      type: "stdout";
      data: string;
    }
  | {
      type: "stderr";
      data: string;
    }
  | {
      type: "exit";
      result: ShellResult;
    }
  | {
      type: "error";
      error: string;
    };

export type RunShellStreamOptions = {
  cwd: string;
  timeoutMs: number;
  maxCaptureChars: number;
  env?: NodeJS.ProcessEnv;
};

class BoundedCapture {
  private readonly headLimit: number;
  private readonly tailLimit: number;
  private full = "";
  private head = "";
  private tail = "";
  private total = 0;

  constructor(private readonly maxChars: number) {
    this.headLimit = Math.max(0, Math.floor(maxChars * 0.65));
    this.tailLimit = Math.max(0, maxChars - this.headLimit - 80);
  }

  append(chunk: string): void {
    const previousTotal = this.total;
    this.total += chunk.length;

    if (this.total <= this.maxChars) {
      this.full += chunk;
      return;
    }

    if (previousTotal <= this.maxChars) {
      const combined = this.full + chunk;
      this.head = combined.slice(0, this.headLimit);
      this.tail = this.tailLimit > 0 ? combined.slice(-this.tailLimit) : "";
      this.full = "";
      return;
    }

    if (this.tailLimit > 0) {
      this.tail = (this.tail + chunk).slice(-this.tailLimit);
    }
  }

  bytes(): number {
    return this.total;
  }

  text(): string {
    if (this.total <= this.maxChars) return this.full;
    const omitted = Math.max(0, this.total - this.maxChars);
    return `${this.head}\n\n...[truncated ${omitted} chars]...\n\n${this.tail}`;
  }
}

class AsyncQueue<T> {
  private readonly items: T[] = [];
  private readonly waiters: Array<() => void> = [];
  private closed = false;

  push(item: T): void {
    if (this.closed) return;
    this.items.push(item);
    this.waiters.shift()?.();
  }

  close(): void {
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter();
    }
  }

  async shift(): Promise<T | undefined> {
    while (this.items.length === 0) {
      if (this.closed) return undefined;
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    return this.items.shift();
  }
}

export async function* runShellStream(
  command: string,
  options: RunShellStreamOptions,
): AsyncGenerator<ShellEvent, ShellResult> {
  const started = Date.now();
  const actualCwd = path.resolve(options.cwd);
  const stdout = new BoundedCapture(Math.floor(options.maxCaptureChars / 2));
  const stderr = new BoundedCapture(Math.floor(options.maxCaptureChars / 2));
  const queue = new AsyncQueue<ShellEvent>();
  let finalResult: ShellResult | undefined;
  let timedOut = false;
  let finished = false;

  const child = spawn("bash", ["-lc", command], {
    cwd: actualCwd,
    env: options.env ?? process.env,
  });

  const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
    if (finished) return;
    finished = true;
    finalResult = {
      command,
      cwd: actualCwd,
      exitCode,
      signal,
      stdout: stdout.text(),
      stderr: stderr.text(),
      stdoutBytes: stdout.bytes(),
      stderrBytes: stderr.bytes(),
      durationMs: Date.now() - started,
      timedOut,
    };
    queue.push({ type: "exit", result: finalResult });
    queue.close();
  };

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 1000).unref();
  }, options.timeoutMs);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    stdout.append(chunk);
    queue.push({ type: "stdout", data: chunk });
  });

  child.stderr.on("data", (chunk: string) => {
    stderr.append(chunk);
    queue.push({ type: "stderr", data: chunk });
  });

  child.on("error", (error) => {
    clearTimeout(timer);
    queue.push({ type: "error", error: error.message });
    finish(1, null);
  });

  child.on("close", (exitCode, signal) => {
    clearTimeout(timer);
    finish(exitCode, signal);
  });

  while (true) {
    const event = await queue.shift();
    if (!event) break;
    yield event;
  }

  return finalResult ?? {
    command,
    cwd: actualCwd,
    exitCode: 1,
    signal: null,
    stdout: stdout.text(),
    stderr: "Shell process ended without a close event.",
    stdoutBytes: stdout.bytes(),
    stderrBytes: stderr.bytes(),
    durationMs: Date.now() - started,
    timedOut,
  };
}
