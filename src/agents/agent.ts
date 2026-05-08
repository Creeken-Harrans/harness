import type { DeepSeekClient } from "../deepseek/client.js";
import type { ContextManager } from "../context.js";
import type { AppConfig } from "../config/config.js";
import type { MemoryStore } from "../memory.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";
import type { ToolRunner } from "../tools/runner.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { Workspace } from "../workspace/workspace.js";
import type { NotesStore } from "../notes/notes.js";

export type AgentContext = {
  config: AppConfig;
  client: DeepSeekClient;
  contextBuilder: ContextManager;
  toolRegistry: ToolRegistry;
  toolRunner: ToolRunner;
  memoryStore: MemoryStore;
  workspace: Workspace;
  notes?: NotesStore;
  runLoop(input: string): AsyncGenerator<AgentEvent, AgentResult>;
};

export interface Agent {
  name: string;
  description: string;
  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult>;
}

export function agentInput(instruction: string, input: string): string {
  return instruction.trim() + "\n\nUser task:\n" + input;
}

