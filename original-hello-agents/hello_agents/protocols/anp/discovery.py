"""ANP discovery module."""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ServiceInfo:
    """Service information for ANP discovery."""
    service_id: str = ""
    service_name: str = ""
    endpoint: str = ""
    service_type: str = ""
    metadata: dict = field(default_factory=dict)


class ANPDiscovery:
    """Agent Network Protocol discovery service."""

    def __init__(self):
        self._services = {}

    def register(self, name, endpoint, metadata=None):
        self._services[name] = {"endpoint": endpoint, "metadata": metadata or {}}
        return name

    def discover(self, name=None):
        """Discover services. If name is provided, return specific service info.
        Otherwise, return list of all services as ServiceInfo objects."""
        if name:
            info = self._services.get(name)
            if info is None:
                return None
            return ServiceInfo(
                service_id=name,
                service_name=info.get("metadata", {}).get("name", name),
                endpoint=info.get("endpoint", ""),
                service_type=info.get("metadata", {}).get("type", ""),
                metadata=info.get("metadata", {}),
            )
        return self.list_all_services()

    def list_all_services(self):
        """List all registered services as ServiceInfo objects."""
        result = []
        for name, info in self._services.items():
            result.append(ServiceInfo(
                service_id=name,
                service_name=info.get("metadata", {}).get("name", name),
                endpoint=info.get("endpoint", ""),
                service_type=info.get("metadata", {}).get("type", ""),
                metadata=info.get("metadata", {}),
            ))
        return result

    def discover_services(self, service_type=None, **filters):
        """Discover services by type and optional filters. Returns list[ServiceInfo]."""
        results = []
        for name, info in self._services.items():
            if service_type and info.get("metadata", {}).get("type") != service_type:
                continue
            results.append(ServiceInfo(
                service_id=name,
                service_name=info.get("metadata", {}).get("name", name),
                endpoint=info.get("endpoint", ""),
                service_type=info.get("metadata", {}).get("type", ""),
                metadata=info.get("metadata", {}),
            ))
        return results


_global_discovery = ANPDiscovery()


def register_service(name=None, endpoint=None, metadata=None, discovery=None, **kwargs):
    # Allow service_id as alternative to name parameter
    effective_name = name or kwargs.get("service_id") or kwargs.get("service_name") or "unknown_service"
    target = discovery if discovery is not None else _global_discovery
    return target.register(effective_name, endpoint, metadata)


def discover_service(name=None, service_type=None, discovery=None, **kwargs):
    target = discovery if discovery is not None else _global_discovery
    if service_type:
        return target.discover_services(service_type=service_type)
    if name:
        return target.discover(name)
    return target.list_all_services()
