"""A2A server module."""


class A2AServer:
    """Agent-to-Agent protocol server."""

    def __init__(self, name="A2AServer", port=8001, **kwargs):
        self.name = name
        self.port = port
        # Accept extra kwargs for forward compatibility with richer implementations
        self.description = kwargs.get("description", "")
        self.version = kwargs.get("version", "0.1.0")
        self.capabilities = kwargs.get("capabilities", {})
        self._skills: dict = {}

    def start(self):
        return f"A2A Server {self.name} starting on port {self.port}"

    def register_agent(self, agent):
        pass

    @property
    def skills(self) -> dict:
        return self._skills

    def run(self, task=None, agent_name=None, **kwargs):
        """Execute a task on the A2A server."""
        return f"A2A Server {self.name} executed: {task or 'default task'}"

    def skill(self, name):
        """Decorator to register a skill on the A2A server."""
        def decorator(func):
            if not hasattr(self, '_skills'):
                self._skills = {}
            self._skills[name] = func
            return func
        return decorator
