"""Reward helpers for chapter 11 Agentic-RL examples."""

from __future__ import annotations

import re
from typing import Any, Callable, Iterable, List, Sequence

RewardFunction = Callable[[Sequence[str]], List[float]]


class MathRewardFunction:
    """Base math-answer reward function used by the chapter 11 examples."""

    def __init__(self, tolerance: float = 1e-4):
        self.tolerance = tolerance

    def __call__(self, completions: Sequence[str], **kwargs: Any) -> List[float]:
        ground_truth = kwargs.get("ground_truth") or kwargs.get("answers") or []
        return [
            1.0 if self.compare_answers(self.extract_answer(completion), truth) else 0.0
            for completion, truth in zip(completions, ground_truth)
        ]

    def extract_answer(self, text: str) -> str:
        """Extract a final numeric/text answer from common math-response formats."""
        patterns = [
            r"Final Answer\s*:\s*([^\n]+)",
            r"####\s*([^\n]+)",
            r"(?:the\s+)?answer\s+(?:is|should be)\s+([^\n.]+)",
            r"result\s+is\s+([^\n.]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        numbers = re.findall(r"-?\d+(?:\.\d+)?", text)
        return numbers[-1] if numbers else text.strip()

    def compare_answers(self, prediction: str | None, ground_truth: Any) -> bool:
        """Compare answers numerically when possible, otherwise by normalized text."""
        if prediction is None:
            return False
        pred = str(prediction).strip()
        truth = str(ground_truth).strip()

        try:
            return abs(float(pred) - float(truth)) <= self.tolerance
        except ValueError:
            return self._normalize(pred) == self._normalize(truth)

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value.lower().strip())


class AccuracyReward(MathRewardFunction):
    """Reward 1.0 for correct answers and 0.0 otherwise."""


class LengthPenaltyReward:
    """Apply a length penalty to a base reward function."""

    def __init__(
        self,
        base_reward: Callable[..., List[float]] | None = None,
        penalty_weight: float = 0.001,
        max_length: int = 512,
    ):
        self.base_reward = base_reward or AccuracyReward()
        self.penalty_weight = penalty_weight
        self.max_length = max_length

    def __call__(self, completions: Sequence[str], **kwargs: Any) -> List[float]:
        base_scores = self.base_reward(completions, **kwargs)
        scores: List[float] = []
        for completion, score in zip(completions, base_scores):
            overflow = max(0, len(completion) - self.max_length)
            scores.append(max(0.0, score - overflow * self.penalty_weight))
        return scores


class StepReward:
    """Add a bounded bonus for explicit reasoning steps."""

    def __init__(
        self,
        base_reward: Callable[..., List[float]] | None = None,
        step_bonus: float = 0.1,
        max_steps: int = 10,
    ):
        self.base_reward = base_reward or AccuracyReward()
        self.step_bonus = step_bonus
        self.max_steps = max_steps

    def __call__(self, completions: Sequence[str], **kwargs: Any) -> List[float]:
        base_scores = self.base_reward(completions, **kwargs)
        scores: List[float] = []
        for completion, score in zip(completions, base_scores):
            if score <= 0:
                scores.append(0.0)
                continue
            step_count = len(re.findall(r"\b(?:step\s*\d+|步骤\s*\d+)\b", completion, re.IGNORECASE))
            scores.append(score + min(step_count, self.max_steps) * self.step_bonus)
        return scores


def create_accuracy_reward(tolerance: float = 1e-4) -> AccuracyReward:
    return AccuracyReward(tolerance=tolerance)


def create_length_penalty_reward(
    base_reward: Callable[..., List[float]] | None = None,
    penalty_weight: float = 0.001,
    max_length: int = 512,
) -> LengthPenaltyReward:
    return LengthPenaltyReward(base_reward, penalty_weight=penalty_weight, max_length=max_length)


def create_step_reward(
    base_reward: Callable[..., List[float]] | None = None,
    step_bonus: float = 0.1,
    max_steps: int = 10,
) -> StepReward:
    return StepReward(base_reward, step_bonus=step_bonus, max_steps=max_steps)


def format_math_dataset(samples: Iterable[dict[str, Any]]) -> list[dict[str, str]]:
    """Format math samples into prompt/answer dictionaries."""
    formatted = []
    for sample in samples:
        question = str(sample.get("question", sample.get("problem", "")))
        answer = str(sample.get("answer", sample.get("ground_truth", "")))
        formatted.append({"prompt": question, "answer": answer})
    return formatted


def create_sft_dataset(samples: Iterable[dict[str, Any]]) -> list[dict[str, str]]:
    return format_math_dataset(samples)


def create_rl_dataset(samples: Iterable[dict[str, Any]]) -> list[dict[str, str]]:
    return format_math_dataset(samples)


class GSM8KDataset:
    """Small wrapper matching the dataset abstraction described in chapter 11."""

    def __init__(self, samples: Iterable[dict[str, Any]]):
        self.samples = list(samples)

    def to_sft(self) -> list[dict[str, str]]:
        return create_sft_dataset(self.samples)

    def to_rl(self) -> list[dict[str, str]]:
        return create_rl_dataset(self.samples)


__all__ = [
    "MathRewardFunction",
    "AccuracyReward",
    "LengthPenaltyReward",
    "StepReward",
    "GSM8KDataset",
    "create_accuracy_reward",
    "create_length_penalty_reward",
    "create_step_reward",
    "format_math_dataset",
    "create_sft_dataset",
    "create_rl_dataset",
]
