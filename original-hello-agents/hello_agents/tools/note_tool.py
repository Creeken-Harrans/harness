"""NoteTool — persistent note-taking for chapter 9."""
import json
import os
from typing import Any
from .base import LightweightTool


class NoteTool(LightweightTool):
    def __init__(self, storage_dir="./notes", **kwargs):
        super().__init__(name="note", description="Note-taking tool")
        self.storage_dir = kwargs.pop("workspace", storage_dir)
        os.makedirs(self.storage_dir, exist_ok=True)
        self._extra_config = kwargs

    # 教程兼容：run 简化签名故意与 Tool 基类不同，接受 str|dict 并返回 str
    def run(self, params):  # type: ignore[override]  # 教程简化协议：run() 返回 str 而非 ToolResponse
        if isinstance(params, str):
            params = {"action": params}
        action = params.get("action", "list")
        if action == "create":
            return self._create(params)
        elif action == "read":
            return self._read(params)
        elif action == "update":
            return self._update(params)
        elif action == "delete":
            return self._delete(params)
        elif action == "search":
            return self._search(params)
        elif action == "list":
            return self._list()
        elif action == "summary":
            return self._summary()
        return json.dumps({"error": f"unknown action: {action}"})

    def _path(self, name):
        return os.path.join(self.storage_dir, f"{name}.json")

    def _create(self, p):
        data = {"title": p.get("title", ""), "content": p.get("content", ""),
                "tags": p.get("tags", [])}
        with open(self._path(p.get("title", "note")), "w") as f:
            json.dump(data, f, ensure_ascii=False)
        return json.dumps({"status": "created", "title": data["title"]})

    def _read(self, p):
        try:
            with open(self._path(p.get("title", ""))) as f:
                return json.dumps(json.load(f), ensure_ascii=False)
        except FileNotFoundError:
            return json.dumps({"error": "note not found"})

    def _update(self, p):
        data = self._read(p)
        if "error" in data:
            return data
        existing = json.loads(data)
        existing.update({k: v for k, v in p.items() if k not in ("action", "title")})
        with open(self._path(p.get("title", "")), "w") as f:
            json.dump(existing, f, ensure_ascii=False)
        return json.dumps({"status": "updated"})

    def _delete(self, p):
        try:
            os.remove(self._path(p.get("title", "")))
            return json.dumps({"status": "deleted"})
        except FileNotFoundError:
            return json.dumps({"error": "note not found"})

    def _search(self, p):
        query = p.get("query", "").lower()
        results = []
        for fn in os.listdir(self.storage_dir):
            if fn.endswith(".json"):
                with open(os.path.join(self.storage_dir, fn)) as f:
                    data = json.load(f)
                    if query in json.dumps(data).lower():
                        results.append(data)
        return json.dumps(results, ensure_ascii=False)

    def _list(self):
        notes = []
        for fn in sorted(os.listdir(self.storage_dir)):
            if fn.endswith(".json"):
                notes.append(fn[:-5])
        return json.dumps(notes)

    def _summary(self):
        return json.dumps({"total_notes": len([f for f in os.listdir(self.storage_dir)
                                                if f.endswith(".json")])})
