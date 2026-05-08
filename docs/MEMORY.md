# Memory

The runtime distinguishes memory concepts even though the active storage is still JSON.

- working memory: current task state, mostly handled by session and notes.
- episodic memory: prior run/session facts.
- semantic memory: durable project/user facts.
- procedural memory: reusable workflows or preferences.

## Current Implementation

src/memory.ts remains the compatible JSON MemoryStore and stores data/memory.json. It includes keyword search plus Chinese character and bigram terms.

src/memory/json-store.ts wraps the compatible store behind the newer MemoryStoreInterface.

src/notes writes task state under data/notes:

- NOTES.md
- TODO.md
- DECISIONS.md
- ERRORS.md
- PROGRESS.md

## Future Work

src/memory/sqlite-store.ts is an explicit TODO skeleton. No SQLite dependency is installed in this phase. Vector search and embedding ingestion are planned for python/rag or a later TypeScript module.

