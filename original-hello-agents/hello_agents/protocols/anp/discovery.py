"""ANP discovery module."""


class ANPDiscovery:
    """Agent Network Protocol discovery service."""

    def __init__(self):
        self._services = {}

    def register(self, name, endpoint, metadata=None):
        self._services[name] = {"endpoint": endpoint, "metadata": metadata or {}}
        return name

    def discover(self, name=None):
        if name:
            return self._services.get(name)
        return list(self._services.keys())


_global_discovery = ANPDiscovery()


def register_service(name, endpoint, metadata=None):
    return _global_discovery.register(name, endpoint, metadata)


def discover_service(name=None):
    return _global_discovery.discover(name)
