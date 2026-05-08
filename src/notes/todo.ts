import crypto from "node:crypto";
import fs from "node:fs";
import type { NotesStore } from "./notes.js";

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
};

const TODO_LINE = /^- \[( |x)\] ([a-zA-Z0-9_-]+): (.*)$/;

export class TodoStore {
  constructor(private readonly notes: NotesStore) {}

  add(text: string): TodoItem {
    const id = crypto.randomUUID().slice(0, 8);
    const item = { id, text: text.trim(), done: false };
    this.notes.append("TODO.md", `- [ ] ${item.id}: ${item.text}`);
    return item;
  }

  list(): TodoItem[] {
    return this.notes
      .read("TODO.md")
      .split(/\r?\n/)
      .map((line) => {
        const match = TODO_LINE.exec(line);
        if (!match) return null;
        return { id: match[2], done: match[1] === "x", text: match[3] };
      })
      .filter((item): item is TodoItem => item !== null);
  }

  update(id: string, done: boolean): TodoItem | undefined {
    const lines = this.notes.read("TODO.md").split(/\r?\n/);
    let updated: TodoItem | undefined;
    const nextLines = lines.map((line) => {
      const match = TODO_LINE.exec(line);
      if (!match || match[2] !== id) return line;
      updated = { id, done, text: match[3] };
      return `- [${done ? "x" : " "}] ${id}: ${match[3]}`;
    });
    if (updated) {
      fs.writeFileSync(this.notes.path("TODO.md"), nextLines.join("\n"));
    }
    return updated;
  }
}
