import { MemoryStore as LegacyMemoryStore, type MemoryEntry } from "../memory.js";
import type { MemoryKind, MemoryRecord, MemoryStoreInterface } from "./memory.js";

function toRecord(entry: MemoryEntry, kind: MemoryKind = "semantic"): MemoryRecord {
  return { ...entry, kind };
}

export class JsonMemoryStore implements MemoryStoreInterface {
  private readonly legacy: LegacyMemoryStore;

  constructor(dataDir: string) {
    this.legacy = new LegacyMemoryStore(dataDir);
  }

  add(text: string, tags: string[] = [], source: MemoryRecord["source"] = "manual", kind: MemoryKind = "semantic"): MemoryRecord {
    return toRecord(this.legacy.add(text, [...tags, "kind:" + kind], source), kind);
  }

  search(query: string, limit = 8): MemoryRecord[] {
    return this.legacy.search(query, limit).map((entry) => toRecord(entry));
  }

  list(limit = 20): MemoryRecord[] {
    return this.legacy.list(limit).map((entry) => toRecord(entry));
  }

  count(): number {
    return this.legacy.count();
  }
}

