import { recordDecision } from "../../notes/decisions.js";
import { recordError } from "../../notes/errors.js";
import { TodoStore } from "../../notes/todo.js";
import type { Tool } from "../tool.js";

function requireNotes(ctx: Parameters<Tool["run"]>[1]) {
  if (!ctx.notes) throw new Error("Notes store is not configured.");
  return ctx.notes;
}

export function createNotesTools(): Tool[] {
  return [
    {
      name: "note_read",
      risk: "read",
      description: "Read long-running task notes from data/notes.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "NOTES.md, TODO.md, DECISIONS.md, ERRORS.md, or PROGRESS.md. Default NOTES.md." },
        },
        additionalProperties: false,
      },
      run(input, ctx) {
        const notes = requireNotes(ctx);
        const allowed = ["NOTES.md", "TODO.md", "DECISIONS.md", "ERRORS.md", "PROGRESS.md"];
        const file = typeof input.file === "string" ? input.file : "NOTES.md";
        if (!allowed.includes(file)) throw new Error("Unsupported notes file: " + file);
        const content = notes.read(file as Parameters<typeof notes.read>[0]);
        return { ok: true, content, data: { file, content } };
      },
    },
    {
      name: "note_append",
      risk: "write",
      description: "Append a timestamped note to data/notes/NOTES.md.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const notes = requireNotes(ctx);
        const text = String(input.text ?? "").trim();
        if (!text) throw new Error("text is required.");
        notes.appendSection("NOTES.md", text);
        return { ok: true, content: "Appended note.", data: { file: "NOTES.md" } };
      },
    },
    {
      name: "todo_add",
      risk: "write",
      description: "Add a todo item to data/notes/TODO.md.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const text = String(input.text ?? "").trim();
        if (!text) throw new Error("text is required.");
        const item = new TodoStore(requireNotes(ctx)).add(text);
        return { ok: true, content: JSON.stringify(item, null, 2), data: item };
      },
    },
    {
      name: "todo_list",
      risk: "read",
      description: "List todo items from data/notes/TODO.md.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run(_input, ctx) {
        const items = new TodoStore(requireNotes(ctx)).list();
        return { ok: true, content: JSON.stringify(items, null, 2), data: { items } };
      },
    },
    {
      name: "todo_update",
      risk: "write",
      description: "Mark a todo item done or not done in data/notes/TODO.md.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          done: { type: "boolean" },
        },
        required: ["id", "done"],
        additionalProperties: false,
      },
      run(input, ctx) {
        const id = String(input.id ?? "").trim();
        if (!id) throw new Error("id is required.");
        const item = new TodoStore(requireNotes(ctx)).update(id, input.done === true);
        if (!item) return { ok: false, content: "Todo not found: " + id, error: "Todo not found." };
        return { ok: true, content: JSON.stringify(item, null, 2), data: item };
      },
    },
    {
      name: "decision_record",
      risk: "write",
      description: "Record an architectural or task decision in data/notes/DECISIONS.md.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
      run(input, ctx) {
        recordDecision(requireNotes(ctx), String(input.text ?? ""));
        return { ok: true, content: "Recorded decision." };
      },
    },
    {
      name: "error_record",
      risk: "write",
      description: "Record an error and diagnosis in data/notes/ERRORS.md.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
      run(input, ctx) {
        recordError(requireNotes(ctx), String(input.text ?? ""));
        return { ok: true, content: "Recorded error." };
      },
    },
    {
      name: "progress_record",
      risk: "write",
      description: "Record progress in data/notes/PROGRESS.md.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
      run(input, ctx) {
        requireNotes(ctx).appendSection("PROGRESS.md", String(input.text ?? ""));
        return { ok: true, content: "Recorded progress." };
      },
    },
  ];
}
