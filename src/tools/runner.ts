import type { AppConfig } from "../config.js";
import type { MemoryStore } from "../memory.js";
import type { Terminal } from "../terminal.js";
import type { ToolCall } from "../types.js";
import type { AgentEvent } from "../runtime/events.js";

export type AskFn = (question: string) => Promise<string>;

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function stringArg(args: Record<string, unknown>, name: string, required = true): string | undefined {
  const value = args[name];
  if (value == null) {
    if (required) throw new Error(`Missing required argument: ${name}`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`Argument ${name} must be a string.`);
  return value;
}

function numberArg(args: Record<string, unknown>, name: string): number | undefined {
  const value = args[name];
  if (value == null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Argument ${name} must be a finite number.`);
  return value;
}

function stringArrayArg(args: Record<string, unknown>, name: string): string[] {
  const value = args[name];
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`Argument ${name} must be an array.`);
  return value.map((v) => String(v));
}

async function confirmShell(ask: AskFn, command: string, cwd: string | undefined): Promise<boolean> {
  const answer = await ask(`\nModel wants to run shell command${cwd ? ` in ${cwd}` : ""}:\n  ${command}\nApprove? [y/N] `);
  return ["y", "yes"].includes(answer.trim().toLowerCase());
}

function jsonResult(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export class ToolRunner {
  constructor(
    private readonly config: AppConfig,
    private readonly memory: MemoryStore,
    private readonly terminal: Terminal,
    private readonly ask: AskFn,
  ) {}

  async run(call: ToolCall): Promise<string> {
    const stream = this.runWithEvents(call, "compat");
    let next = await stream.next();
    while (!next.done) {
      next = await stream.next();
    }
    return next.value;
  }

  async *runWithEvents(call: ToolCall, runId: string): AsyncGenerator<AgentEvent, string> {
    let result = "";

    try {
      const args = parseArgs(call.function.arguments);

      switch (call.function.name) {
        case "memory_add": {
          const text = stringArg(args, "text", true)!;
          const tags = stringArrayArg(args, "tags");
          const entry = this.memory.add(text, tags, "assistant");
          result = jsonResult({ ok: true, saved: entry });
          yield {
            type: "tool_call_end",
            runId,
            toolCallId: call.id,
            name: call.function.name,
            ok: true,
            result,
          };
          return result;
        }

        case "memory_search": {
          const query = stringArg(args, "query", true)!;
          const limit = Math.min(Math.max(Math.floor(numberArg(args, "limit") ?? 8), 1), 20);
          const results = this.memory.search(query, limit);
          result = jsonResult({ ok: true, results });
          yield {
            type: "tool_call_end",
            runId,
            toolCallId: call.id,
            name: call.function.name,
            ok: true,
            result,
          };
          return result;
        }

        case "shell_exec": {
          const command = stringArg(args, "command", true)!;
          const cwd = stringArg(args, "cwd", false);
          const timeoutMs = numberArg(args, "timeoutMs");

          this.terminal.assertAllowed(command);

          if (this.config.approvalMode !== "never") {
            const approved = await confirmShell(this.ask, command, cwd);
            if (!approved) {
              result = jsonResult({ ok: false, declined: true, message: "User declined shell command." });
              yield {
                type: "tool_call_end",
                runId,
                toolCallId: call.id,
                name: call.function.name,
                ok: false,
                result,
              };
              return result;
            }
          }

          const shell = this.terminal.runStream(command, cwd, timeoutMs);
          let next = await shell.next();
          while (!next.done) {
            const event = next.value;
            if (event.type === "stdout") {
              yield { type: "tool_stdout", runId, toolCallId: call.id, data: event.data };
            } else if (event.type === "stderr") {
              yield { type: "tool_stderr", runId, toolCallId: call.id, data: event.data };
            } else if (event.type === "error") {
              yield { type: "tool_stderr", runId, toolCallId: call.id, data: event.error };
            } else if (event.type === "exit") {
              const ok = event.result.exitCode === 0 && !event.result.timedOut;
              result = jsonResult({ ok, result: event.result });
              yield {
                type: "tool_call_end",
                runId,
                toolCallId: call.id,
                name: call.function.name,
                ok,
                result,
                shellResult: event.result,
              };
            }
            next = await shell.next();
          }

          if (!result) {
            const shellResult = next.value;
            const ok = shellResult.exitCode === 0 && !shellResult.timedOut;
            result = jsonResult({ ok, result: shellResult });
            yield {
              type: "tool_call_end",
              runId,
              toolCallId: call.id,
              name: call.function.name,
              ok,
              result,
              shellResult,
            };
          }

          return result;
        }

        case "get_session_info": {
          result = jsonResult({
            ok: true,
            now: new Date().toISOString(),
            workspace: this.config.workspace,
            model: this.config.model,
            thinking: this.config.thinking,
            approvalMode: this.config.approvalMode,
            memoryCount: this.memory.count(),
          });
          yield {
            type: "tool_call_end",
            runId,
            toolCallId: call.id,
            name: call.function.name,
            ok: true,
            result,
          };
          return result;
        }

        default:
          result = jsonResult({ ok: false, error: `Unknown tool: ${call.function.name}` });
          yield {
            type: "tool_call_end",
            runId,
            toolCallId: call.id,
            name: call.function.name,
            ok: false,
            result,
          };
          return result;
      }
    } catch (error) {
      result = jsonResult({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      yield {
        type: "tool_call_end",
        runId,
        toolCallId: call.id,
        name: call.function.name,
        ok: false,
        result,
      };
      return result;
    }
  }
}
