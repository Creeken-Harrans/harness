import fs from "node:fs";
import path from "node:path";

export type NoteFileName = "NOTES.md" | "TODO.md" | "DECISIONS.md" | "ERRORS.md" | "PROGRESS.md";

const DEFAULT_CONTENT: Record<NoteFileName, string> = {
  "NOTES.md": "# Notes\n",
  "TODO.md": "# Todo\n",
  "DECISIONS.md": "# Decisions\n",
  "ERRORS.md": "# Errors\n",
  "PROGRESS.md": "# Progress\n",
};

export class NotesStore {
  readonly dir: string;

  constructor(dataDir: string) {
    this.dir = path.join(dataDir, "notes");
    fs.mkdirSync(this.dir, { recursive: true });
    for (const [file, content] of Object.entries(DEFAULT_CONTENT) as Array<[NoteFileName, string]>) {
      const filePath = this.path(file);
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
    }
  }

  path(file: NoteFileName): string {
    return path.join(this.dir, file);
  }

  read(file: NoteFileName): string {
    return fs.readFileSync(this.path(file), "utf8");
  }

  append(file: NoteFileName, text: string): void {
    const entry = text.endsWith("\n") ? text : `${text}\n`;
    fs.appendFileSync(this.path(file), entry);
  }

  appendSection(file: NoteFileName, text: string): void {
    this.append(file, `\n## ${new Date().toISOString()}\n${text.trim()}\n`);
  }
}

