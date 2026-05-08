import type { MemoryKind, MemoryRecord, MemoryStoreInterface } from "./memory.js";

export class SqliteMemoryStore implements MemoryStoreInterface {
  constructor(_dbPath: string) {
    throw new Error("SqliteMemoryStore is a Phase 5 extension point. No SQLite dependency is installed yet.");
  }

  add(_text: string, _tags?: string[], _source?: MemoryRecord["source"], _kind?: MemoryKind): MemoryRecord {
    throw new Error("SqliteMemoryStore is not implemented.");
  }

  search(_query: string, _limit?: number): MemoryRecord[] {
    throw new Error("SqliteMemoryStore is not implemented.");
  }

  list(_limit?: number): MemoryRecord[] {
    throw new Error("SqliteMemoryStore is not implemented.");
  }

  count(): number {
    throw new Error("SqliteMemoryStore is not implemented.");
  }
}

