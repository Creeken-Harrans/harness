export type MemoryKind = "working" | "episodic" | "semantic" | "procedural";

export type MemoryRecord = {
  id: string;
  text: string;
  tags: string[];
  source: "user" | "assistant" | "tool" | "manual";
  kind: MemoryKind;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type MemoryQuery = {
  query: string;
  limit?: number;
  kinds?: MemoryKind[];
};

export interface MemoryStoreInterface {
  add(text: string, tags?: string[], source?: MemoryRecord["source"], kind?: MemoryKind): MemoryRecord;
  search(query: string, limit?: number): MemoryRecord[];
  list(limit?: number): MemoryRecord[];
  count(): number;
}

