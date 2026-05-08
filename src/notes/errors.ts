import type { NotesStore } from "./notes.js";

export function recordError(notes: NotesStore, text: string): void {
  notes.appendSection("ERRORS.md", text);
}

