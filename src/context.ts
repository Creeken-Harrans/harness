import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "./config.js";
import type { MemoryEntry, MemoryStore } from "./memory.js";
import type { ChatMessage, StoredMessage } from "./types.js";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function messageText(message: ChatMessage): string {
  if (typeof message.content === "string") return message.content;
  if (message.content == null) return "";
  return JSON.stringify(message.content);
}

function sanitizeHistoricalMessage(message: StoredMessage): ChatMessage | null {
  // Keep only plain conversational history across turns.
  // Old tool-call structures are intentionally dropped to avoid orphan tool messages
  // after context trimming. Current-turn tool calls are preserved inside AgentRuntime.
  if (message.role !== "user" && message.role !== "assistant") return null;

  const content = messageText(message).trim();
  if (!content) return null;

  return {
    role: message.role,
    content,
  };
}

function readOptionalTextFile(filePath: string, maxChars = 12_000): string {
  if (!fs.existsSync(filePath)) return "";
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.slice(0, maxChars);
}

function formatMemories(memories: MemoryEntry[]): string {
  if (memories.length === 0) return "No relevant memories found.";
  return memories
    .map((m, i) => `${i + 1}. [${m.createdAt}] ${m.text}${m.tags.length ? ` #${m.tags.join(" #")}` : ""}`)
    .join("\n");
}

export class ContextManager {
  constructor(
    private readonly config: AppConfig,
    private readonly memory: MemoryStore,
  ) {}

  build(history: StoredMessage[], latestUserInput: string): ChatMessage[] {
    const soul = readOptionalTextFile(path.resolve(process.cwd(), "SOUL.md"));
    const agents = readOptionalTextFile(path.resolve(this.config.workspace, "AGENTS.md"));
    const relevantMemories = this.memory.search(latestUserInput, 8);

    const system = [
      "You are DeepSeek Mini Harness, a local-first CLI agent written in TypeScript.",
      "You can chat, save/search memory, and request terminal commands through tools.",
      "Use tools only when they materially help. Prefer safe, inspect-first commands before modifying files.",
      "Never run destructive shell commands unless the user explicitly asks and the command has been approved.",
      "When a shell command fails, explain the error and propose the next small diagnostic step.",
      "Answer the user in Chinese by default, unless the user asks otherwise.",
      "Specialized terms should include Chinese and English when useful.",
      `Current working directory for shell tools: ${this.config.workspace}`,
      soul ? `\nProject SOUL.md:\n${soul}` : "",
      agents ? `\nWorkspace AGENTS.md:\n${agents}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const memoryBlock = `Relevant persistent memory:\n${formatMemories(relevantMemories)}`;

    const result: ChatMessage[] = [
      { role: "system", content: system },
      { role: "system", content: memoryBlock },
    ];

    const budgetChars = this.config.maxContextTokens * 4;
    let used = result.reduce((sum, m) => sum + messageText(m).length, 0);

    const cleaned = history
      .map(sanitizeHistoricalMessage)
      .filter((m): m is ChatMessage => m !== null);

    const selected: ChatMessage[] = [];
    for (let i = cleaned.length - 1; i >= 0; i--) {
      const m = cleaned[i];
      const size = messageText(m).length + 32;
      if (used + size > budgetChars) break;
      selected.unshift(m);
      used += size;
    }

    result.push(...selected);
    return result;
  }
}
