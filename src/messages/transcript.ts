import type { ChatMessage, StoredMessage } from "./message.js";

export class Transcript {
  private readonly messages: StoredMessage[];

  constructor(messages: StoredMessage[] = []) {
    this.messages = [...messages];
  }

  append(message: ChatMessage): void {
    this.messages.push({ ...message, createdAt: new Date().toISOString() });
  }

  all(): StoredMessage[] {
    return [...this.messages];
  }

  recent(limit: number): StoredMessage[] {
    return this.messages.slice(-Math.max(0, limit));
  }
}
