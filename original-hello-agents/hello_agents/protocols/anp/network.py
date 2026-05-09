"""ANP network module."""


class ANPNetwork:
    """Agent Network Protocol network manager."""

    def __init__(self, discovery=None, network_id=None):
        self.discovery = discovery
        self.network_id = network_id
        self.nodes = {}

    def add_node(self, name, endpoint):
        self.nodes[name] = endpoint

    def register_service(self, name, endpoint=None, discovery=None, **kwargs):
        """Register a service on the ANP network."""
        self.nodes[name] = endpoint or f"http://localhost:8000/{name}"

    def route(self, task, target=None):
        return {"routed_to": target, "result": f"ANP routed: {task}"}

    def connect_nodes(self, node_a, node_b):
        """Connect two nodes in the ANP network."""
        return {"status": "connected", "nodes": [node_a, node_b]}

    def get_network_stats(self):
        """Get network statistics."""
        return {"nodes": len(self.nodes), "status": "healthy"}
