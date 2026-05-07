import type { AppConfig } from "../config.js";
import type { MemoryStore } from "../memory.js";
import type { Terminal } from "../terminal.js";
import type { ToolCall } from "../types.js";

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

export class ToolRunner {
  constructor(
    private readonly config: AppConfig,
    private readonly memory: MemoryStore,
    private readonly terminal: Terminal,
    private readonly ask: AskFn,
  ) {}

  async run(call: ToolCall): Promise<string> {
    try {
      const args = parseArgs(call.function.arguments);

      switch (call.function.name) {
        case "memory_add": {
          const text = stringArg(args, "text", true)!;
          const tags = stringArrayArg(args, "tags");
          const entry = this.memory.add(text, tags, "assistant");
          return JSON.stringify({ ok: true, saved: entry }, null, 2);
        }

        case "memory_search": {
          const query = stringArg(args, "query", true)!;
          const limit = Math.min(Math.max(Math.floor(numberArg(args, "limit") ?? 8), 1), 20);
          const results = this.memory.search(query, limit);
          return JSON.stringify({ ok: true, results }, null, 2);
        }

        case "shell_exec": {
          const command = stringArg(args, "command", true)!;
          const cwd = stringArg(args, "cwd", false);
          const timeoutMs = numberArg(args, "timeoutMs");

          this.terminal.assertAllowed(command);

          if (this.config.approvalMode !== "never") {
            const approved = await confirmShell(this.ask, command, cwd);
            if (!approved) {
              return JSON.stringify({ ok: false, declined: true, message: "User declined shell command." }, null, 2);
            }
          }

          const result = await this.terminal.run(command, cwd, timeoutMs);
          return JSON.stringify({ ok: result.exitCode === 0 && !result.timedOut, result }, null, 2);
        }

        case "get_session_info": {
          return JSON.stringify(
            {
              ok: true,
              now: new Date().toISOString(),
              workspace: this.config.workspace,
              model: this.config.model,
              thinking: this.config.thinking,
              approvalMode: this.config.approvalMode,
              memoryCount: this.memory.count(),
            },
            null,
            2,
          );
        }

        default:
          return JSON.stringify({ ok: false, error: `Unknown tool: ${call.function.name}` }, null, 2);
      }
    } catch (error) {
      return JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      );
    }
  }
}
