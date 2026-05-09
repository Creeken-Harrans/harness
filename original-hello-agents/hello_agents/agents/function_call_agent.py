"""FunctionCallAgent — function-calling agent for chapter 9 (CodebaseMaintainer)."""
from typing import Any


class FunctionCallAgent:
    """Simple function-calling agent that delegates tool execution to the LLM."""

    def __init__(self, name="FunctionCallAgent", llm: Any = None, system_prompt=None, config=None, tools=None, **kwargs):
        self.name = name
        self.llm: Any = llm
        self.system_prompt = system_prompt
        self.config = config or {}
        self.tools = tools or []
        self.tool_registry = kwargs.pop("tool_registry", None)
        self.enable_tool_calling = kwargs.pop("enable_tool_calling", False)
        self.max_tool_iterations = kwargs.pop("max_tool_iterations", 10)
        self.message_history: list = []
        self._extra_config = kwargs

    def run(self, task: str, **_: Any) -> str:
        messages: list[dict[str, str]] = []
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        messages.append({"role": "user", "content": task})
        if self.llm is not None and hasattr(self.llm, 'think'):
            return self.llm.think(messages=messages) or ""
        return f"[FunctionCallAgent response to: {task}]"

    def add_tool(self, tool: Any) -> None:
        self.tools.append(tool)
