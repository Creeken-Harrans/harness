import type { Tool } from "../tool.js";

export function createMemoryTools(): Tool[] {
  return [
    {
      name: "memory_add",
      risk: "safe",
      description: "Persist a durable memory for later sessions. Use only for stable user preferences, project facts, or explicit remember requests.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Concise self-contained memory text." },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags." },
        },
        required: ["text"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const text = String(input.text ?? "").trim();
        if (!text) return { ok: false, content: "Missing required memory text.", error: "Missing required memory text." };
        const tags = Array.isArray(input.tags) ? input.tags.map(String) : [];
        const entry = ctx.memory.add(text, tags, "assistant");
        return { ok: true, content: `Saved memory ${entry.id}`, data: { saved: entry } };
      },
    },
    {
      name: "memory_search",
      risk: "read",
      description: "Search persistent memory for facts relevant to the current task.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          limit: { type: "number", description: "Maximum memories to return. Default 8." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const query = String(input.query ?? "").trim();
        if (!query) return { ok: false, content: "Missing search query.", error: "Missing search query." };
        const rawLimit = typeof input.limit === "number" ? input.limit : 8;
        const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 20);
        const results = ctx.memory.search(query, limit);
        return { ok: true, content: JSON.stringify(results, null, 2), data: { results } };
      },
    },
    {
      name: "memory_list",
      risk: "read",
      description: "List recent persistent memories.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Maximum memories to return. Default 10." },
        },
        additionalProperties: false,
      },
      run(input, ctx) {
        const rawLimit = typeof input.limit === "number" ? input.limit : 10;
        const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 50);
        const results = ctx.memory.list(limit);
        return { ok: true, content: JSON.stringify(results, null, 2), data: { results } };
      },
    },
  ];
}

