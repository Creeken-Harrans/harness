import fs from "node:fs";
import path from "node:path";
import type { ChatMessage, StoredMessage } from "./types.js";

export type SessionState = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
};

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function safeSessionId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "default";
}

export class SessionStore {
  private state: SessionState;
  private readonly filePath: string;

  constructor(dataDir: string, sessionId = "default") {
    const dir = path.join(dataDir, "sessions");
    ensureDir(dir);
    const id = safeSessionId(sessionId);
    this.filePath = path.join(dir, `${id}.json`);
    this.state = this.load(id);
  }

  private load(id: string): SessionState {
    if (fs.existsSync(this.filePath)) {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8")) as SessionState;
    }
    const now = new Date().toISOString();
    return { id, createdAt: now, updatedAt: now, messages: [] };
  }

  private save(): void {
    this.state.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  append(message: ChatMessage): void {
    const stored: StoredMessage = {
      ...message,
      createdAt: new Date().toISOString(),
    };
    this.state.messages.push(stored);
    this.save();
  }

  clear(): void {
    const now = new Date().toISOString();
    this.state = {
      id: this.state.id,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    this.save();
  }

  getMessages(): StoredMessage[] {
    return [...this.state.messages];
  }

  id(): string {
    return this.state.id;
  }

  messageCount(): number {
    return this.state.messages.length;
  }
}
