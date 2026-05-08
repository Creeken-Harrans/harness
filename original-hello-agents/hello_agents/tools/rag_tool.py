"""RAGTool — Retrieval-Augmented Generation for chapter 8."""
from __future__ import annotations
import json
from typing import Any


def _int(v: Any, default: int = 10) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _str(v: Any, default: str = "") -> str:
    if v is None:
        return default
    return str(v)


class RAGTool:
    def __init__(self, user_id="default", embedding_model="text-embedding-3-small"):
        self.user_id = user_id
        self.embedding_model = embedding_model
        self.documents: dict[str, list[dict[str, Any]]] = {}

    def run(self, params: dict | str) -> str:
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
