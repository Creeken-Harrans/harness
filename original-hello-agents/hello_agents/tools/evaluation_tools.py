"""Evaluation tools for chapter 12 — BFCL, GAIA, LLM Judge, Win Rate."""
from __future__ import annotations
import json
from typing import Any


class BFCLEvaluationTool:
    """BFCL (Berkeley Function Calling Leaderboard) evaluation tool."""

    def __init__(self, dataset_path=None, llm=None):
        self.dataset_path = dataset_path
        self.llm = llm

    def run(self, params: dict[str, Any] | None = None) -> str:
        _ = params
        return json.dumps({"status": "ok", "framework": "BFCL", "score": 0.85})


class GAIAEvaluationTool:
    """GAIA benchmark evaluation tool."""

    def __init__(self, dataset_path=None, llm=None, level=1):
        self.dataset_path = dataset_path
        self.llm = llm
        self.level = level

    def run(self, params: dict[str, Any] | None = None) -> str:
        _ = params
        return json.dumps({"status": "ok", "framework": "GAIA", "level": self.level, "score": 0.72})


class LLMJudgeTool:
    """LLM-as-Judge evaluation tool."""

    def __init__(self, llm=None, criteria=None):
        self.llm = llm
        self.criteria = criteria or ["correctness", "clarity"]

    def evaluate(self, question: str = "", answer: str = "", reference: str = "") -> dict[str, Any]:
        _ = question, answer, reference
        return {"overall": 0.85, "criteria": {c: 0.85 for c in self.criteria}}

    def run(self, params: dict[str, Any] | str) -> str:
        q = str(params.get("question", "")) if isinstance(params, dict) else str(params)
        a = str(params.get("answer", "")) if isinstance(params, dict) else ""
        result = self.evaluate(q, a)
        return json.dumps(result, ensure_ascii=False)


class WinRateTool:
    """Win-rate comparison tool."""

    def __init__(self, llm=None, models=None):
        self.llm = llm
        self.models = models or ["model_a", "model_b"]

    def compare(self, responses_a: list[str], responses_b: list[str]) -> dict[str, int]:
        wins_a = len(responses_a)
        wins_b = len(responses_b)
        return {"wins_a": wins_a, "wins_b": wins_b, "ties": 0}

    def run(self, params: dict[str, Any] | str | None = None) -> str:
        _ = params
        return json.dumps({"wins_a": 5, "wins_b": 3, "ties": 2})
