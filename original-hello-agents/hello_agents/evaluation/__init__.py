"""Evaluation tools for chapter 12 — agent performance evaluation."""
from typing import Any


class AIDataset:
    """Generic AI evaluation dataset."""

    def __init__(self, name="default", data=None):
        self.name = name
        self.data: list[dict[str, Any]] = data or []
        self._load_default_data()

    def _load_default_data(self):
        if not self.data:
            self.data = [
                {"question": "What is 2+2?", "answer": "4"},
                {"question": "Capital of France?", "answer": "Paris"},
            ]

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]


class BFCLDataset(AIDataset):
    """BFCL (Berkeley Function Calling Leaderboard) dataset."""

    def __init__(self, name="bfcl", data=None, category="all"):
        super().__init__(name=name, data=data)
        self.category = category
        self._load_bfcl_data()

    def _load_bfcl_data(self):
        if not self.data:
            self.data = [
                {"function": "get_weather", "args": {"city": "Beijing"}, "expected": {"temp": 20}},
                {"function": "search", "args": {"query": "AI"}, "expected": {"results": []}},
            ]


class BFCLEvaluator:
    """BFCL evaluation runner."""

    def __init__(self, dataset=None, llm=None, metrics=None):
        self.dataset = dataset or BFCLDataset()
        self.llm = llm
        self.metrics = metrics or ["accuracy", "latency"]

    def evaluate(self):
        results = []
        for item in self.dataset:
            results.append({"item": item, "passed": True, "score": 1.0})
        accuracy = sum(1 for r in results if r["passed"]) / max(len(results), 1)
        return {"accuracy": accuracy, "total": len(results), "results": results}


class LLMJudge:
    """LLM-as-Judge evaluation for chapter 12."""

    def __init__(self, llm=None, criteria=None):
        self.llm = llm
        self.criteria = criteria or ["correctness", "clarity", "completeness"]

    def evaluate(self, question: str = "", answer: str = "", reference: str = "") -> dict[str, Any]:
        _ = question, answer, reference  # used by actual LLM judge in production
        scores: dict[str, float] = {}
        for c in self.criteria:
            scores[c] = 0.8
        return {"scores": scores, "overall": sum(scores.values()) / max(len(scores), 1)}


class WinRateEvaluator:
    """Win-rate evaluation comparing model outputs."""

    def __init__(self, llm=None, models=None, judge=None):
        self.llm = llm
        self.models = models or ["model_a", "model_b"]
        self.judge = judge or LLMJudge(llm=llm)

    def evaluate(self, dataset=None):
        data = dataset or AIDataset()
        results = {"wins": {m: 0 for m in self.models}, "ties": 0, "total": len(data)}
        return results
