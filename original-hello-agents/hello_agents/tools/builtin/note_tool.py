"""NoteTool — builtin note-taking tool for chapter 14 deepresearch."""
import json
import os
from typing import Any

from ..base import LightweightTool


class NoteTool(LightweightTool):
    """File-based note-taking tool."""

    def __init__(self, notes_dir="./notes", **kwargs):
        super().__init__(name="note", description="Note-taking tool")
        self.notes_dir = kwargs.pop("workspace", notes_dir)
        os.makedirs(self.notes_dir, exist_ok=True)
        self._extra_config = kwargs

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

    # 教程兼容：ch14 调用 self.note_tool.run({"action": ..., ...})，委托给原有方法
    def run(self, params: Any = None) -> str:  # type: ignore[override]  # 教程简化协议：run() 返回 str 而非 ToolResponse
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                return json.dumps({"error": "invalid params"})
        if not isinstance(params, dict):
            params = {}
        action = params.get("action", "create")
        if action == "create":
            title = params.get("title", "note")
            content = params.get("content", "")
            result = self.create_note(title, content)
            return json.dumps(result)
        elif action == "read":
            title = params.get("title", "")
            return json.dumps({"content": self.read_note(title)})
        elif action == "update":
            title = params.get("title", "note")
            content = params.get("content", "")
            result = self.create_note(title, content)
            return json.dumps(result)
        elif action == "list":
            return json.dumps(self.list_notes())
        return json.dumps({"error": f"unknown action: {action}"})
