import type { AppConfig } from "../config/config.js";
import type { MemoryStore } from "../memory.js";
import type { SessionStore } from "../session.js";
import type { Terminal } from "../terminal.js";
import type { ApprovalPolicy } from "../security/approval.js";
import type { Workspace } from "../workspace/workspace.js";
import type { NotesStore } from "../notes/notes.js";

export type ToolRisk = "safe" | "read" | "write" | "shell" | "network" | "dangerous";

export type JsonSchema = Record<string, unknown>;

export type ToolResult = {
  ok: boolean;
  content: string;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  truncated?: boolean;
};

export type ToolEvent =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "progress"; message: string; data?: unknown }
  | { type: "result"; result: ToolResult }
  | { type: "error"; error: string };

export type ToolRunResult =
  | ToolResult
  | Promise<ToolResult>
  | AsyncGenerator<ToolEvent, ToolResult>;

export type ToolContext = {
  config: AppConfig;
  memory: MemoryStore;
  session?: SessionStore;
  terminal: Terminal;
  workspace: Workspace;
  notes?: NotesStore;
  runId: string;
  tracePath?: string;
  approval: ApprovalPolicy;
  signal?: AbortSignal;
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  risk: ToolRisk;
  timeoutMs?: number;
  run(input: Record<string, unknown>, ctx: ToolContext): ToolRunResult;
};

export function okToolResult(content: string, data?: unknown, metadata?: Record<string, unknown>): ToolResult {
  return { ok: true, content, data, metadata };
}

export function errorToolResult(error: string, data?: unknown): ToolResult {
  return { ok: false, content: error, error, data };
}

