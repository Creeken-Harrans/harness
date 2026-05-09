"""RAGTool — Retrieval-Augmented Generation for chapter 8."""
from __future__ import annotations
import json
from typing import Any
from .base import LightweightTool


def _int(v: Any, default: int = 10) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _str(v: Any, default: str = "") -> str:
    if v is None:
        return default
    return str(v)


class RAGTool(LightweightTool):
    def __init__(self, user_id="default", embedding_model="text-embedding-3-small", **kwargs):
        super().__init__(name="rag", description="RAG Tool")
        self.user_id = kwargs.pop("user_id", user_id)
        self.embedding_model = embedding_model
        self.knowledge_base_path = kwargs.pop("knowledge_base_path", "./knowledge")
        self.rag_namespace = kwargs.pop("rag_namespace", "default")
        self.documents: dict[str, list[dict[str, Any]]] = {}
        self._extra_config = kwargs

    # 教程兼容：run 简化签名故意与 Tool 基类不同，接受 str|dict 并返回 str
    def run(self, params: dict | str) -> str:  # type: ignore[override]  # 教程简化协议：run() 返回 str 而非 ToolResponse
        if isinstance(params, str):
            params = {"action": params}
        action = _str(params.get("action"), "search")
        if action == "ingest":
            content = _str(params.get("content", params.get("text")))
            doc_id = _str(params.get("doc_id", params.get("document_id")), "doc_1")
            chunk_size = _int(params.get("chunk_size"), 500)
            chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
            self.documents[doc_id] = [{"index": i, "text": c, "id": f"{doc_id}_{i}"}
                                      for i, c in enumerate(chunks)]
            return json.dumps({"status": "ok", "doc_id": doc_id, "chunks": len(chunks)})
        elif action == "search":
            query = _str(params.get("query"))
            limit_val = _int(params.get("limit", params.get("top_k")), 5)
            results: list[dict[str, Any]] = []
            for doc_id, chunks in self.documents.items():
                for chunk in chunks:
                    if query.lower() in chunk["text"].lower():
                        results.append({"doc_id": doc_id, "chunk_id": chunk["id"],
                                        "text": chunk["text"][:300], "score": 0.8})
            return json.dumps(results[:limit_val], ensure_ascii=False)
        elif action == "qa":
            question = _str(params.get("question", params.get("query")))
            search_results = json.loads(self.run({"action": "search", "query": question}))
            context = "\n".join([r.get("text", "") for r in search_results])
            return json.dumps({"question": question, "context": context,
                               "answer": f"[RAG answer for: {question}]"}, ensure_ascii=False)
        elif action == "stats":
            total = sum(len(c) for c in self.documents.values())
            return json.dumps({"documents": len(self.documents), "total_chunks": total})
        elif action == "clear":
            self.documents.clear()
            return json.dumps({"status": "ok"})
        return json.dumps({"error": f"unknown action: {action}"})

    def batch_add_texts(self, texts: list[str], metadatas: list[dict] | None = None,
                        document_ids: list[str] | None = None) -> list[str]:
        """批量添加文本到知识库，返回文档 ID 列表。"""
        ids: list[str] = []
        for i, text in enumerate(texts):
            doc_id = (document_ids[i] if document_ids and i < len(document_ids)
                      else f"batch_{len(self.documents)}_{i}")
            meta = (metadatas or [{}] * len(texts))[i] if metadatas else {}
            self.run({"action": "ingest", "content": text, "doc_id": doc_id, **meta})
            ids.append(doc_id)
        return ids
