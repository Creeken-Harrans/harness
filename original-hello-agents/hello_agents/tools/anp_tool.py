"""ANPTool — Agent Network Protocol for chapter 10."""
import json
from typing import Dict, Any


class ANPTool:
    def __init__(self, name="anp", description="ANP Tool", discovery=None):
        self.name = name
        self.description = description
        self.discovery = discovery
        self.services: dict = {}

    def run(self, params):
        if isinstance(params, str):
            try: params = json.loads(params)
            except json.JSONDecodeError: return json.dumps({"error": "invalid params"})
        action = params.get("action", "discover_services")
        if action == "register_service":
            sid = params.get("service_id", f"svc_{len(self.services)}")
            self.services[sid] = {
                "service_type": params.get("service_type", "generic"),
                "endpoint": params.get("endpoint", ""),
                "load": params.get("load", 0),
                "cpu": params.get("cpu", 0), "gpu": params.get("gpu", 0),
                "memory": params.get("memory", 0),
            }
            return json.dumps({"status": "registered", "service_id": sid})
        elif action == "discover_services":
            stype = (params or {}).get("service_type")
            result = {sid: s for sid, s in self.services.items()
                      if stype is None or s.get("service_type") == stype}
            return json.dumps(result, ensure_ascii=False)
        elif action == "select_service":
            stype = params.get("service_type", "")
            candidates = [(sid, s) for sid, s in self.services.items()
                          if s.get("service_type") == stype]
            if not candidates:
                return json.dumps({"error": "no matching services"})
            best = min(candidates, key=lambda x: x[1].get("load", 0))
            return json.dumps({"selected": best[0], "info": best[1]})
        elif action == "get_best_node":
            if not self.services:
                return json.dumps({"error": "no services"})
            best = min(self.services.items(), key=lambda x: x[1].get("load", 0))
            return json.dumps({"selected": best[0], "info": best[1]})
        return json.dumps({"error": f"unknown action: {action}"})
