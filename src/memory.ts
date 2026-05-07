import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type MemoryEntry = {
  id: string;
  text: string;
  tags: string[];
  source: "user" | "assistant" | "tool" | "manual";
  createdAt: string;
};

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFKC");
}

function terms(input: string): Set<string> {
  const out = new Set<string>();
  const s = normalize(input);

  for (const m of s.matchAll(/[\p{L}\p{N}_-]+/gu)) {
    const token = m[0];
    if (token.length >= 2) out.add(token);
  }

  const han = [...s.matchAll(/[\p{Script=Han}]/gu)].map((m) => m[0]);
  for (let i = 0; i < han.length; i++) {
    out.add(han[i]);
    if (i + 1 < han.length) out.add(han[i] + han[i + 1]);
  }

  return out;
}

export class MemoryStore {
  private entries: MemoryEntry[] = [];
  private readonly filePath: string;

  constructor(dataDir: string) {
    ensureDir(dataDir);
    this.filePath = path.join(dataDir, "memory.json");
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.entries = [];
      return;
    }
    const raw = fs.readFileSync(this.filePath, "utf8");
    this.entries = JSON.parse(raw) as MemoryEntry[];
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2));
  }

  add(text: string, tags: string[] = [], source: MemoryEntry["source"] = "manual"): MemoryEntry {
    const cleaned = text.trim();
    if (!cleaned) throw new Error("Cannot save an empty memory.");

    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      text: cleaned,
      tags: tags.map((t) => t.trim()).filter(Boolean),
      source,
      createdAt: new Date().toISOString(),
    };
    this.entries.unshift(entry);
    this.save();
    return entry;
  }

  list(limit = 20): MemoryEntry[] {
    return this.entries.slice(0, limit);
  }

  count(): number {
    return this.entries.length;
  }

  search(query: string, limit = 8): MemoryEntry[] {
    const qTerms = terms(query);
    if (qTerms.size === 0) return this.list(limit);

    const now = Date.now();
    const scored = this.entries.map((entry) => {
      const haystack = `${entry.text} ${entry.tags.join(" ")}`;
      const eTerms = terms(haystack);
      let overlap = 0;
      for (const t of qTerms) if (eTerms.has(t)) overlap += 1;

      const ageDays = Math.max(0, (now - Date.parse(entry.createdAt)) / 86_400_000);
      const recencyBoost = 1 / (1 + ageDays / 30);
      return { entry, score: overlap + 0.15 * recencyBoost };
    });

    return scored
      .filter((x) => x.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.entry);
  }
}
