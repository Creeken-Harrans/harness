"""A2A client module."""


class A2AClient:
    """Agent-to-Agent protocol client."""

    def __init__(self, server_url="http://localhost:8001"):
        self.server_url = server_url

    def send_task(self, task):
        return {"status": "ok", "result": f"A2A result for: {task}"}
