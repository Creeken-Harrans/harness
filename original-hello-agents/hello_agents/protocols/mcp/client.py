"""MCP client — Model Context Protocol client for chapter 10."""
import json


class MCPClient:
    """Model Context Protocol client."""

    def __init__(self, server_url="http://localhost:8000", transport="stdio"):
        self.server_url = server_url
        self.transport = transport

    def call_tool(self, tool_name, arguments=None):
        return {"result": f"MCP call to {tool_name}", "args": arguments or {}}

    def list_tools(self):
        return ["weather", "search", "calculator"]


class MCPServer:
    """Model Context Protocol server (alias for MCPClient in tutorial context)."""

    def __init__(self, name="MCPServer", port=8000):
        self.name = name
        self.port = port
        self.tools = {}

    def register_tool(self, name, handler):
        self.tools[name] = handler

    def start(self):
        return f"MCP Server {self.name} on port {self.port}"
