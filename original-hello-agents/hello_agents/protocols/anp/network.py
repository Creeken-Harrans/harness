"""ANP network module."""


class ANPNetwork:
    """Agent Network Protocol network manager."""

    def __init__(self, discovery=None):
        self.discovery = discovery
        self.nodes = {}

    def add_node(self, name, endpoint):
        self.nodes[name] = endpoint

    def route(self, task, target=None):
        return {"routed_to": target, "result": f"ANP routed: {task}"}
