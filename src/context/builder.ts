import type { AppConfig } from "../config/config.js";
import type { MemoryStore } from "../memory.js";
import type { ChatMessage, StoredMessage } from "../types.js";
import { approximateTokens } from "./budget.js";
import { gatherContextSources, type ContextSource } from "./gather.js";
import { selectContextSources } from "./select.js";
import { structureDeepSeekMessages } from "./structure.js";

export type ContextBuildReport = {
  budget: {
    maxTokens: number;
    usedTokens: number;
  };
  selectedSources: Array<{ id: string; kind: ContextSource["kind"]; estimatedTokens: number }>;
  droppedSources: Array<{ source: string; reason: string; estimatedTokens: number }>;
  recentSessionCount: number;
  memoryHits: number;
  workspaceIndexStatus: string;
};

export class ContextBuilder {
  private report: ContextBuildReport | undefined;

  constructor(
    private readonly config: AppConfig,
    private readonly memory: MemoryStore,
  ) {}

  build(history: StoredMessage[], latestUserInput: string): ChatMessage[] {
    const sources = gatherContextSources({ config: this.config, memory: this.memory, history, latestUserInput });
    const selected = selectContextSources(sources, this.config.maxContextTokens);
    const messages = structureDeepSeekMessages(selected);
    this.report = {
      budget: {
        maxTokens: selected.budget.maxTokens,
        usedTokens: selected.budget.usedTokens,
      },
      selectedSources: selected.systemSources.map((source) => ({
        id: source.id,
        kind: source.kind,
        estimatedTokens: approximateTokens(source.content),
      })),
      droppedSources: selected.budget.dropped,
      recentSessionCount: selected.transcript.length,
      memoryHits: Number(selected.systemSources.find((source) => source.id === "memory-relevant")?.metadata?.hits ?? 0),
      workspaceIndexStatus: selected.systemSources.some((source) => source.id === "workspace-index") ? "selected" : "dropped",
    };
    return messages;
  }

  lastReport(): ContextBuildReport | undefined {
    return this.report;
  }
}

