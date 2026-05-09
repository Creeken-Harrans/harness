"""MCP client — Model Context Protocol client for chapter 10."""
from __future__ import annotations
import json
from typing import Union, List


class MCPClient:
    """Model Context Protocol client."""

    def __init__(self, server_url=None, transport="stdio"):
        if server_url is None:
            server_url = "http://localhost:8000"
        if isinstance(server_url, list):
            self.command = server_url
            self.server_url = "stdio://local"
        else:
            self.command = None
            self.server_url = server_url
        self.transport = transport
        self._connected = False

    async def __aenter__(self):
        self._connected = True
        return self

    async def __aexit__(self, *args):
        self._connected = False

    async def call_tool(self, tool_name, arguments=None):
        import json as _json
        return _json.dumps({"result": f"MCP call to {tool_name}", "args": arguments or {}})

    async def list_tools(self) -> list[dict]:
        return [{"name": "weather", "description": "Get weather data",
                 "inputSchema": {"type": "object", "properties": {"city": {"type": "string", "description": "City name"}}}},
                {"name": "search", "description": "Search the web",
                 "inputSchema": {"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}}},
                {"name": "calculator", "description": "Perform calculations",
                 "inputSchema": {"type": "object", "properties": {"expression": {"type": "string", "description": "Math expression"}}}}]


class MCPServer:
    """Model Context Protocol server (alias for MCPClient in tutorial context)."""

    def __init__(self, name="MCPServer", port=8000, **kwargs):
        self.name = name
        self.port = port
        self.description = kwargs.get("description", "")
        self.tools = {}

    def register_tool(self, name, handler=None):
        if handler is None and callable(name):
            handler = name
            name = getattr(handler, '__name__', 'tool')
        self.tools[name] = handler

    def add_tool(self, name, handler=None):
        """Alias for register_tool, used by chapter 10 examples."""
        if handler is None and callable(name):
            return self.register_tool(name)
        self.register_tool(name, handler)

    def start(self):
        return f"MCP Server {self.name} on port {self.port}"

    def run(self, task=None, **kwargs):
        """Execute a task on the MCP server."""
        return f"MCP Server {self.name} executed: {task or 'default task'}"
