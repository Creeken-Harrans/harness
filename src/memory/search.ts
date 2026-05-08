export function normalizeForSearch(input: string): string {
  return input.toLowerCase().normalize("NFKC");
}

export function keywordAndChineseBigramTerms(input: string): Set<string> {
  const out = new Set<string>();
  const s = normalizeForSearch(input);
  for (const m of s.matchAll(/[\p{L}\p{N}_-]+/gu)) {
    if (m[0].length >= 2) out.add(m[0]);
  }
  const han = [...s.matchAll(/[\p{Script=Han}]/gu)].map((m) => m[0]);
  for (let i = 0; i < han.length; i++) {
    out.add(han[i]);
    if (i + 1 < han.length) out.add(han[i] + han[i + 1]);
  }
  return out;
}

export type FutureVectorSearchHook = {
  enabled: false;
  reason: "No embedding dependency is installed in the TypeScript runtime yet.";
};

export const futureVectorSearchHook: FutureVectorSearchHook = {
  enabled: false,
  reason: "No embedding dependency is installed in the TypeScript runtime yet.",
};

