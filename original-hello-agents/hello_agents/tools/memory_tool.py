"""MemoryTool — unified memory operations for chapter 8."""
from __future__ import annotations
import json
from typing import Any
from hello_agents.memory import MemoryConfig, MemoryItem, _SimpleMemoryStore


def _float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _int(v: Any, default: int = 10) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _str(v: Any, default: str = "") -> str:
    if v is None:
        return default
    return str(v)


class MemoryTool:
    def __init__(self, user_id="default", memory_types=None, memory_config=None):
        self.user_id = user_id
        self.memory_types = memory_types or ["working", "episodic", "semantic", "perceptual"]
        self.memory_config = memory_config or MemoryConfig()
        self.memory_manager = _MemoryManager(user_id, self.memory_types, self.memory_config)

    def run(self, params: dict | str) -> str:
        if isinstance(params, str):
            params = {"action": params}
        action = _str(params.get("action"), "search")
        mgr = self.memory_manager
        if action == "add":
            store = mgr.get_store(_str(params.get("memory_type"), "working"))
            if store is not None:
                item = MemoryItem(
                    content=_str(params.get("content")),
                    memory_type=_str(params.get("memory_type"), "working"),
                    importance=_float(params.get("importance"), 0.5),
                    metadata={k: v for k, v in params.items()
                              if k not in ("action", "content", "memory_type", "importance")}
                )
                store.add(item)
                return json.dumps({"status": "ok", "id": item.id}, ensure_ascii=False)
            return json.dumps({"status": "error", "message": "unknown memory type"})
        elif action == "search":
            results: list = []
            mt = params.get("memory_type")
            stores = [mgr.get_store(mt)] if mt else list(mgr.memory_types.values())
            for s in stores:
                if s:
                    results.extend(s.search(_str(params.get("query")),
                                            min_importance=_float(params.get("min_importance"), 0.0),
                                            limit=_int(params.get("limit"), 10)))
            results.sort(key=lambda x: (x.importance, x.timestamp), reverse=True)
            limit_val = _int(params.get("limit"), 10)
            results = results[:limit_val]
            return json.dumps([{"id": r.id, "content": r.content[:200],
                                "type": r.memory_type, "importance": r.importance}
                               for r in results], ensure_ascii=False)
        elif action == "summary":
            results = []
            for s in mgr.memory_types.values():
                results.extend(s.search("", limit=_int(params.get("limit"), 5)))
            results.sort(key=lambda x: x.timestamp, reverse=True)
            limit_val = _int(params.get("limit"), 5)
            return json.dumps([{"id": r.id, "content": r.content[:150], "type": r.memory_type}
                               for r in results[:limit_val]], ensure_ascii=False)
        elif action == "stats":
            all_stats: dict = {t: len(s.items) for t, s in mgr.memory_types.items()}
            all_stats["total"] = sum(all_stats.values())
            return json.dumps(all_stats)
        elif action == "forget":
            strategy = _str(params.get("strategy"), "importance_based")
            threshold = _float(params.get("threshold"), 0.3)
            count = 0
            for s in mgr.memory_types.values():
                if strategy == "importance_based":
                    count += s.forget_by_importance(threshold)
            return json.dumps({"status": "ok", "forgotten": count})
        elif action == "consolidate":
            store = mgr.get_store(_str(params.get("from_type"), "working"))
            count = store.consolidate(_str(params.get("from_type"), "working"),
                                      _str(params.get("to_type"), "episodic"),
                                      _float(params.get("importance_threshold"), 0.6)) if store else 0
            return json.dumps({"status": "ok", "consolidated": count})
        elif action in ("update", "remove", "clear_all"):
            if action == "clear_all":
                for s in mgr.memory_types.values():
                    s.items.clear()
            return json.dumps({"status": "ok", "action": action})
        return json.dumps({"status": "error", "message": f"unknown action: {action}"})


class _MemoryManager:
    def __init__(self, user_id, memory_types, config):
        self.user_id = user_id
        self.memory_types = {t: _SimpleMemoryStore() for t in memory_types}
        self.config = config

    def get_store(self, memory_type):
        return self.memory_types.get(memory_type)
