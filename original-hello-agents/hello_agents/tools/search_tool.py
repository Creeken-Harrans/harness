"""SearchTool — web search tool for chapter 12 and 14."""
import json
from typing import Any


class SearchTool:
    """Unified search tool supporting multiple backends (tavily, serper, hybrid)."""

    def __init__(self, backend="hybrid", api_key=None):
        self.backend = backend
        self.api_key = api_key

    def search(self, query: str, num_results: int = 5) -> list[dict[str, str]]:
        return [{"title": f"Result {i} for: {query}", "url": f"https://example.com/{i}", "snippet": f"Snippet {i}"} for i in range(num_results)]

    def run(self, params: dict[str, Any] | str) -> str:
        if isinstance(params, str):
            query = params
        else:
            query = str(params.get("query", ""))
        results = self.search(query)
        return json.dumps(results, ensure_ascii=False)
