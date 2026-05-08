export type ContextBudget = {
  maxTokens: number;
  usedTokens: number;
  dropped: Array<{ source: string; reason: string; estimatedTokens: number }>;
};

export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function createBudget(maxTokens: number): ContextBudget {
  return { maxTokens, usedTokens: 0, dropped: [] };
}

