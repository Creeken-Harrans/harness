"""A2A server module."""


class A2AServer:
    """Agent-to-Agent protocol server."""

    def __init__(self, name="A2AServer", port=8001):
        self.name = name
        self.port = port

    def start(self):
        return f"A2A Server {self.name} starting on port {self.port}"

    def register_agent(self, agent):
        pass
