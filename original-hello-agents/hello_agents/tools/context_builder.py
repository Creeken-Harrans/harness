"""ContextBuilder — context engineering for chapter 9."""
from typing import Dict, List


class ContextBuilder:
    def __init__(self, max_tokens=8000):
        self.max_tokens = max_tokens
        self.sections: Dict[str, str] = {}
        self.conversation_history: List[Dict] = []

    def add_section(self, name, content):
        self.sections[name] = content

    def add_conversation(self, role, content):
        self.conversation_history.append({"role": role, "content": content})

    def build(self, template=None):
        parts = [f"## {n}\n{c}" for n, c in self.sections.items()]
        if self.conversation_history:
            parts.append("## Conversation History")
            for msg in self.conversation_history[-10:]:
                parts.append(f"{msg['role']}: {msg['content'][:500]}")
        return "\n\n".join(parts)

    def clear(self):
        self.sections.clear()
        self.conversation_history.clear()

    def estimate_tokens(self):
        return sum(len(v) for v in self.sections.values()) // 4


class ContextConfig:
    def __init__(self, max_tokens=8000, include_history=True, history_limit=10):
        self.max_tokens = max_tokens
        self.include_history = include_history
        self.history_limit = history_limit
