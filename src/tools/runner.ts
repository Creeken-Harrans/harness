import type { AppConfig } from "../config.js";
import type { MemoryStore } from "../memory.js";
import type { SessionStore } from "../session.js";
import type { Terminal } from "../terminal.js";
import type { ToolCall } from "../types.js";
import type { AgentEvent } from "../runtime/events.js";
import type { ShellResult } from "../terminal/stream.js";
import { ApprovalPolicy, type AskFn } from "../security/approval.js";
import { redactValue } from "../security/secrets.js";
import type { Workspace } from "../workspace/workspace.js";
import type { NotesStore } from "../notes/notes.js";
import { ensureToolPermission } from "./permissions.js";
import { ToolRegistry } from "./registry.js";
import type { ToolContext, ToolEvent, ToolResult, ToolRunResult } from "./tool.js";

export type ToolRunnerDeps = {
  config: AppConfig;
  registry: ToolRegistry;
  memory: MemoryStore;
  terminal: Terminal;
  workspace: Workspace;
  ask: AskFn;
  session?: SessionStore;
  notes?: NotesStore;
};

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function validateJsonSchema(schema: Record<string, unknown>, input: Record<string, unknown>): void {
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  for (const key of required) {
    if (!(key in input)) throw new Error(`Missing required argument: ${key}`);
  }

  const properties = schema.properties && typeof schema.properties === "object"
    ? schema.properties as Record<string, Record<string, unknown>>
    : {};
  const additionalProperties = schema.additionalProperties !== false;
  if (!additionalProperties) {
    for (const key of Object.keys(input)) {
      if (!(key in properties)) throw new Error(`Unexpected argument: ${key}`);
    }
  }

  for (const [key, value] of Object.entries(input)) {
    const prop = properties[key];
    if (!prop || value == null) continue;
    const expected = prop.type;
    if (expected === "array" && !Array.isArray(value)) throw new Error(`Argument ${key} must be an array.`);
    if (expected === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new Error(`Argument ${key} must be a finite number.`);
    }
    if (expected === "string" && typeof value !== "string") throw new Error(`Argument ${key} must be a string.`);
    if (expected === "boolean" && typeof value !== "boolean") throw new Error(`Argument ${key} must be a boolean.`);
    if (expected === "object" && (typeof value !== "object" || Array.isArray(value))) {
      throw new Error(`Argument ${key} must be an object.`);
    }
  }
}

function isAsyncGenerator(value: ToolRunResult): value is AsyncGenerator<ToolEvent, ToolResult> {
  return Boolean(value && typeof (value as AsyncGenerator<ToolEvent, ToolResult>)[Symbol.asyncIterator] === "function");
}

function resultToModelContent(result: ToolResult, config: AppConfig): string {
  const safe = redactValue({
    ok: result.ok,
    content: result.content,
    data: result.data,
    error: result.error,
    metadata: result.metadata,
    truncated: result.truncated,
  }, config);
  return JSON.stringify(safe, null, 2);
}

function eventToAgentEvent(event: ToolEvent, runId: string, toolCallId: string): AgentEvent | undefined {
  if (event.type === "stdout") return { type: "tool_stdout", runId, toolCallId, data: event.data };
  if (event.type === "stderr") return { type: "tool_stderr", runId, toolCallId, data: event.data };
  if (event.type === "error") return { type: "tool_stderr", runId, toolCallId, data: event.error };
  if (event.type === "progress") return { type: "tool_progress", runId, toolCallId, message: event.message, data: event.data };
  return undefined;
}

function maybeShellResult(value: unknown): ShellResult | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ShellResult>;
  return typeof candidate.command === "string" && typeof candidate.cwd === "string" && "exitCode" in candidate
    ? candidate as ShellResult
    : undefined;
}

export class ToolRunner {
  readonly registry: ToolRegistry;
  private readonly approval: ApprovalPolicy;

  constructor(private readonly deps: ToolRunnerDeps) {
    this.registry = deps.registry;
    this.approval = new ApprovalPolicy(deps.config, deps.ask);
  }

  get memory(): MemoryStore {
    return this.deps.memory;
  }

  get terminal(): Terminal {
    return this.deps.terminal;
  }

  get workspace(): Workspace {
    return this.deps.workspace;
  }

  get session(): SessionStore | undefined {
    return this.deps.session;
  }

  get notes(): NotesStore | undefined {
    return this.deps.notes;
  }

  async run(call: ToolCall): Promise<string> {
    const stream = this.runWithEvents(call, "compat");
    let next = await stream.next();
    while (!next.done) {
      next = await stream.next();
    }
    return next.value;
  }

  async *runWithEvents(call: ToolCall, runId: string, tracePath?: string): AsyncGenerator<AgentEvent, string> {
    const name = call.function.name;
    let serialized = "";

    try {
      const tool = this.registry.require(name);
      const input = parseArgs(call.function.arguments);
      validateJsonSchema(tool.inputSchema, input);
      await ensureToolPermission(tool, input, this.approval);

      const ctx: ToolContext = {
        config: this.deps.config,
        memory: this.deps.memory,
        session: this.deps.session,
        terminal: this.deps.terminal,
        workspace: this.deps.workspace,
        notes: this.deps.notes,
        approval: this.approval,
        runId,
        tracePath,
      };

      const execution = tool.run(input, ctx);
      let result: ToolResult;

      if (isAsyncGenerator(execution)) {
        let next = await execution.next();
        let resultEvent: ToolResult | undefined;
        while (!next.done) {
          if (next.value.type === "result") {
            resultEvent = next.value.result;
          }
          const agentEvent = eventToAgentEvent(next.value, runId, call.id);
          if (agentEvent) yield agentEvent;
          next = await execution.next();
        }
        result = resultEvent ?? next.value;
      } else {
        result = await execution;
      }

      serialized = resultToModelContent(result, this.deps.config);
      yield {
        type: "tool_call_end",
        runId,
        toolCallId: call.id,
        name,
        ok: result.ok,
        result: serialized,
        shellResult: maybeShellResult(result.data),
      };
      return serialized;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: ToolResult = { ok: false, content: message, error: message };
      serialized = resultToModelContent(result, this.deps.config);
      yield {
        type: "tool_call_end",
        runId,
        toolCallId: call.id,
        name,
        ok: false,
        result: serialized,
      };
      return serialized;
    }
  }
}

export type { AskFn };
