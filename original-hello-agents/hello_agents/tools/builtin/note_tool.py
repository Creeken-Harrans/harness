"""NoteTool — builtin note-taking tool for chapter 14 deepresearch."""
import json
import os
from typing import Dict, Any


class NoteTool:
    """File-based note-taking tool."""

    def __init__(self, notes_dir="./notes"):
        self.notes_dir = notes_dir
        os.makedirs(notes_dir, exist_ok=True)

    def create_note(self, title, content):
        path = os.path.join(self.notes_dir, f"{title}.md")
        with open(path, "w") as f:
            f.write(content)
        return {"status": "ok", "path": path}

    def read_note(self, title):
        path = os.path.join(self.notes_dir, f"{title}.md")
        if os.path.exists(path):
            with open(path) as f:
                return f.read()
        return ""

    def list_notes(self):
        return [f[:-3] for f in os.listdir(self.notes_dir) if f.endswith(".md")]
