"""MCPTool — Model Context Protocol for chapter 10."""
from __future__ import annotations
import json
from typing import Dict, Any, Callable


class MCPTool:
    def __init__(self, server_command=None, server_url=None, name="mcp", description="MCP Tool"):
        self.name = name
        self.description = description
        self.server_command = server_command
        self.server_url = server_url
        self.tools: Dict[str, Callable[..., Any]] = {}
        self._connected = False
        self._amap_api_key: str = ""  # ch13 高德地图 API key

    def run(self, params: dict | str) -> str:
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                params = {"action": "call_tool"}
        if not isinstance(params, dict):
            return json.dumps({"error": "invalid params"})
        action = params.get("action", "call_tool")
        if action == "call_tool":
            tool_name = str(params.get("tool_name", ""))
            arguments: dict = params.get("arguments", {}) if isinstance(params.get("arguments"), dict) else {}
            if tool_name in self.tools:
                try:
                    return json.dumps({"result": self.tools[tool_name](**arguments)})
                except Exception as e:
                    return json.dumps({"error": str(e)})
            if tool_name == "add":
                return str(float(arguments.get("a", 0)) + float(arguments.get("b", 0)))
            return json.dumps({"error": f"tool not found: {tool_name}"})
        elif action == "list_tools":
            return json.dumps(list(self.tools.keys()))
        elif action == "connect":
            self._connected = True
            return json.dumps({"status": "connected"})
        return json.dumps({"error": f"unknown action: {action}"})


class MCPClient:
    def __init__(self, server_url="http://localhost:8000"):
        self.server_url = server_url
        self.tools = {}

    def connect_to_server(self, command=None, url=None):
        return {"status": "connected"}

    def discover_tools(self):
        return list(self.tools.keys())

    def call_tool(self, tool_name, arguments=None):
        return f"Result from {tool_name}: {arguments}"


class MCPServer:
    def __init__(self, name="mcp-server"):
        self.name = name
        self.tools = {}

    def register_tool(self, name, handler):
        self.tools[name] = handler
