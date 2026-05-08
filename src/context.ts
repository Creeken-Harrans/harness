import type { AppConfig } from "./config.js";
import type { MemoryStore } from "./memory.js";
import type { ChatMessage, StoredMessage } from "./types.js";
import { approximateTokens } from "./context/budget.js";
import { ContextBuilder, type ContextBuildReport } from "./context/builder.js";

export function estimateTokens(text: string): number {
  return approximateTokens(text);
}

export class ContextManager {
  private readonly builder: ContextBuilder;

  constructor(
    config: AppConfig,
    memory: MemoryStore,
  ) {
    this.builder = new ContextBuilder(config, memory);
  }

  build(history: StoredMessage[], latestUserInput: string): ChatMessage[] {
    return this.builder.build(history, latestUserInput);
  }

  lastReport(): ContextBuildReport | undefined {
    return this.builder.lastReport();
  }
}

export * from "./context/budget.js";
export * from "./context/builder.js";
export * from "./context/compress.js";
export * from "./context/gather.js";
export * from "./context/select.js";
export * from "./context/structure.js";
