"""A2A implementation details."""
A2A_AVAILABLE = True

from .server import A2AServer  # re-export for convenience

__all__ = ["A2AServer", "A2A_AVAILABLE"]
