"""HelloAgents Memory System — tutorial extensions for chapters 8-9."""
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta


class MemoryConfig:
    def __init__(self, **kwargs):
        self.storage_path = kwargs.pop("storage_path", "./memory_data")
        self.working_memory_capacity = kwargs.pop("working_memory_capacity", 50)
        self.working_memory_ttl_minutes = kwargs.pop("working_memory_ttl_minutes", 60)
        self.working_memory_tokens = kwargs.pop("working_memory_tokens", 2000)
        self.episodic_memory_enabled = kwargs.pop("episodic_memory_enabled", True)
        self.episodic_memory_capacity = kwargs.pop("episodic_memory_capacity", 100)
        self.semantic_memory_enabled = kwargs.pop("semantic_memory_enabled", True)
        self.perceptual_memory_enabled = kwargs.pop("perceptual_memory_enabled", True)
        self.consolidation_interval_minutes = kwargs.pop("consolidation_interval_minutes", 30)
        self.auto_cleanup = kwargs.pop("auto_cleanup", True)
        self.enable_forgetting = kwargs.pop("enable_forgetting", False)
        self.forgetting_threshold = kwargs.pop("forgetting_threshold", 0.3)
        self._extra_config = kwargs


@dataclass
class MemoryItem:
    content: str
    memory_type: str = "working"
    importance: float = 0.5
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    id: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())[:8]


class _SimpleMemoryStore:
    """In-memory store for memory items (tutorial companion)."""
    def __init__(self):
        self.items: List[MemoryItem] = []

    def add(self, item: MemoryItem): self.items.append(item)

    def search(self, query: str, memory_type: Optional[str] = None,
               min_importance: float = 0.0, limit: int = 10) -> List[MemoryItem]:
        results = [i for i in self.items
                   if (not memory_type or i.memory_type == memory_type)
                   and i.importance >= min_importance
                   and query.lower() in i.content.lower()]
        results.sort(key=lambda x: (x.importance, x.timestamp), reverse=True)
        return results[:limit]

    def forget_by_importance(self, threshold: float) -> int:
        before = len(self.items)
        self.items = [i for i in self.items if i.importance >= threshold]
        return before - len(self.items)

    def forget_by_ttl(self, minutes: int) -> int:
        cutoff = datetime.now() - timedelta(minutes=minutes)
        before = len(self.items)
        self.items = [i for i in self.items if i.timestamp > cutoff]
        return before - len(self.items)

    def consolidate(self, from_type: str, to_type: str, threshold: float) -> int:
        count = 0
        for item in self.items:
            if item.memory_type == from_type and item.importance >= threshold:
                item.memory_type = to_type
                count += 1
        return count


class MemoryManager:
    """High-level memory manager used by AI Town NPCs (chapter 15).

    Provides a unified interface over multiple _SimpleMemoryStore instances,
    one per memory type (working, episodic, semantic, perceptual).
    """

    def __init__(self, user_id="default", memory_types=None, config=None, **kwargs):
        self.user_id = kwargs.pop("user_id", user_id)
        self.config = config or MemoryConfig()
        # 解析 enable_* 参数决定启用哪些记忆类型
        enabled_types: list[str] = []
        for mt in (memory_types or ["working", "episodic", "semantic", "perceptual"]):
            flag = kwargs.pop(f"enable_{mt}", True)
            if flag:
                enabled_types.append(mt)
        self.memory_types = enabled_types or (memory_types or ["working", "episodic", "semantic", "perceptual"])
        self._stores: Dict[str, _SimpleMemoryStore] = {
            mt: _SimpleMemoryStore() for mt in self.memory_types
        }
        self._extra_config = kwargs

    def get_store(self, memory_type: str) -> Optional[_SimpleMemoryStore]:
        return self._stores.get(memory_type)

    def add(self, content: str, memory_type="working", importance=0.5, **meta):
        store = self._stores.get(memory_type)
        if store is not None:
            item = MemoryItem(content=content, memory_type=memory_type,
                              importance=importance, metadata=meta)
            store.add(item)
            return item.id
        return None

    def add_memory(self, content: str, memory_type="working", importance=0.5, metadata=None, **kwargs):
        """ch15 兼容别名，等同于 add()。"""
        return self.add(content=content, memory_type=memory_type,
                       importance=importance, metadata=metadata, **kwargs)

    def search(self, query: str, memory_type=None, limit=10):
        results = []
        for mt, store in self._stores.items():
            if memory_type and mt != memory_type:
                continue
            results.extend(store.search(query, memory_type=mt, limit=limit))
        results.sort(key=lambda x: (x.importance, x.timestamp), reverse=True)
        return results[:limit]

    def retrieve_memories(self, query: str = "", memory_types=None, limit: int = 10,
                          min_importance: float = 0.0, **_kw):
        """ch15 兼容：按条件检索记忆并返回 MemoryItem 列表。"""
        results: list = []
        for mt in (memory_types or list(self._stores.keys())):
            store = self._stores.get(mt)
            if store:
                results.extend(store.search(query, memory_type=mt,
                                           min_importance=min_importance, limit=limit))
        results.sort(key=lambda x: (x.importance, x.timestamp), reverse=True)
        return results[:limit]

    def clear_memory_type(self, memory_type: str):
        """清空指定类型的记忆存储。"""
        store = self._stores.get(memory_type)
        if store:
            store.items.clear()

    def consolidate(self, from_type: str, to_type: str, threshold=0.7):
        store = self._stores.get(from_type)
        if store:
            return store.consolidate(from_type, to_type, threshold)
        return 0

