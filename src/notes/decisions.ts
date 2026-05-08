import type { NotesStore } from "./notes.js";

export function recordDecision(notes: NotesStore, text: string): void {
  notes.appendSection("DECISIONS.md", text);
}

