"""A2ATool — Agent-to-Agent protocol for chapter 10."""
from __future__ import annotations
import json
from typing import Dict, Any, Callable


class A2ATool:
    def __init__(self, agent_url="http://localhost:5000", name="a2a", description="A2A Tool"):
        self.name = name
        self.description = description
        self.agent_url = agent_url
        self.skills: Dict[str, Dict[str, Any]] = {}

    def run(self, params: dict | str) -> str:
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                params = {"action": "ask", "question": params}
        if not isinstance(params, dict):
            return json.dumps({"error": "invalid params"})
        action = params.get("action", "ask")
        if action == "ask":
            q = params.get("question", params.get("query", ""))
            return json.dumps({"response": f"A2A response to: {q}"}, ensure_ascii=False)
        elif action == "list_skills":
            return json.dumps(list(self.skills.keys()))
        return json.dumps({"error": f"unknown action: {action}"})


class A2AServer:
    def __init__(self, name="a2a-server", host="localhost", port=5000):
        self.name = name
        self.host = host
        self.port = port
        self.skills: Dict[str, dict] = {}

    def add_skill(self, name, description, handler):
        self.skills[name] = {"description": description, "handler": handler}

    def start(self):
        print(f"A2A Server '{self.name}' started on {self.host}:{self.port}")
