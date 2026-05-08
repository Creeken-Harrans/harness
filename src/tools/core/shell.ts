import type { Tool, ToolEvent, ToolResult } from "../tool.js";

function numberInput(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

async function* runShell(input: Record<string, unknown>, ctx: Parameters<Tool["run"]>[1]): AsyncGenerator<ToolEvent, ToolResult> {
  const command = String(input.command ?? "").trim();
  if (!command) {
    return { ok: false, content: "Missing shell command.", error: "Missing shell command." };
  }

  const cwd = typeof input.cwd === "string" && input.cwd.trim()
    ? ctx.workspace.resolvePath(input.cwd)
    : ctx.workspace.root;
  const timeoutMs = numberInput(input.timeoutMs, ctx.config.shellTimeoutMs);

  ctx.terminal.assertAllowed(command);
  const shell = ctx.terminal.runStream(command, cwd, timeoutMs);
  let next = await shell.next();
  let final: ToolResult | undefined;

  while (!next.done) {
    const event = next.value;
    if (event.type === "stdout") {
      yield { type: "stdout", data: event.data };
    } else if (event.type === "stderr") {
      yield { type: "stderr", data: event.data };
    } else if (event.type === "error") {
      yield { type: "error", error: event.error };
    } else if (event.type === "exit") {
      const ok = event.result.exitCode === 0 && !event.result.timedOut;
      final = {
        ok,
        content: JSON.stringify({
          command: event.result.command,
          cwd: event.result.cwd,
          exitCode: event.result.exitCode,
          signal: event.result.signal,
          stdout: event.result.stdout,
          stderr: event.result.stderr,
          stdoutBytes: event.result.stdoutBytes,
          stderrBytes: event.result.stderrBytes,
          durationMs: event.result.durationMs,
          timedOut: event.result.timedOut,
        }, null, 2),
        data: event.result,
        metadata: {
          exitCode: event.result.exitCode,
          durationMs: event.result.durationMs,
          stdoutBytes: event.result.stdoutBytes,
          stderrBytes: event.result.stderrBytes,
        },
        truncated: event.result.stdoutBytes + event.result.stderrBytes > ctx.config.maxToolOutputChars,
      };
    }
    next = await shell.next();
  }

  return final ?? {
    ok: next.value.exitCode === 0 && !next.value.timedOut,
    content: JSON.stringify(next.value, null, 2),
    data: next.value,
  };
}

export function createShellTools(): Tool[] {
  const shellSchema = {
    type: "object",
    properties: {
      command: { type: "string", description: "Command to execute with bash -lc." },
      cwd: { type: "string", description: "Optional workspace-relative working directory. Defaults to HARNESS_WORKSPACE." },
      timeoutMs: { type: "number", description: "Optional timeout in milliseconds." },
    },
    required: ["command"],
    additionalProperties: false,
  };

  return [
    {
      name: "shell_exec_stream",
      risk: "shell",
      description: "Run a shell command in HARNESS_WORKSPACE with live stdout/stderr streaming. Requires approval unless approvals are disabled.",
      inputSchema: shellSchema,
      run: runShell,
    },
    {
      name: "shell_exec",
      risk: "shell",
      description: "Compatibility alias for shell_exec_stream.",
      inputSchema: shellSchema,
      run: runShell,
    },
  ];
}

