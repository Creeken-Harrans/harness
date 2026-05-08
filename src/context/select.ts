import type { ChatMessage } from "../messages/message.js";
import { approximateTokens, createBudget, type ContextBudget } from "./budget.js";
import type { ContextSource } from "./gather.js";

export type SelectedContext = {
  systemSources: ContextSource[];
  transcript: ChatMessage[];
  budget: ContextBudget;
};

function sourceTokens(source: ContextSource): number {
  return source.tokens ?? approximateTokens(source.content);
}

export function selectContextSources(sources: ContextSource[], maxTokens: number): SelectedContext {
  const budget = createBudget(maxTokens);
  const systemSources: ContextSource[] = [];
  const transcriptSources: ContextSource[] = [];
  const sorted = [...sources].sort((a, b) => b.priority - a.priority);

  for (const source of sorted) {
    const tokens = sourceTokens(source);
    const mandatory = source.kind === "system" || source.kind === "soul" || source.kind === "agents";
    if (!mandatory && budget.usedTokens + tokens > budget.maxTokens) {
      budget.dropped.push({ source: source.id, reason: "context budget exceeded", estimatedTokens: tokens });
      continue;
    }
    budget.usedTokens += tokens;
    if (source.kind === "session") {
      transcriptSources.push(source);
    } else {
      systemSources.push(source);
    }
  }

  const transcript = transcriptSources
    .sort((a, b) => Number(a.metadata?.index ?? 0) - Number(b.metadata?.index ?? 0))
    .map((source) => {
      const role = source.metadata?.role === "assistant" ? "assistant" : "user";
      return { role, content: source.content } satisfies ChatMessage;
    });
  return { systemSources, transcript, budget };
}
