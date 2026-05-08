"""RLTrainingTool — RL training for chapter 11."""
import json
from typing import Dict, Any


class RLTrainingTool:
    def __init__(self):
        self.training_history = []

    def run(self, params):
        if isinstance(params, str):
            try: params = json.loads(params)
            except json.JSONDecodeError: return json.dumps({"error": "invalid params"})
        action = params.get("action", "train")
        if action == "load_dataset":
            ms = params.get("max_samples", 100)
            return json.dumps({
                "dataset_name": "gsm8k", "dataset_size": min(ms, 100),
                "split": params.get("split", "train"),
                "format": params.get("format_type", "sft"),
                "samples_preview": [{"question": f"Q{i}", "answer": f"A{i}"}
                                    for i in range(min(5, ms))]
            })
        elif action == "train":
            self.training_history.append(params)
            return json.dumps({
                "status": "completed",
                "algorithm": params.get("algorithm", "sft"),
                "model_name": params.get("model_name", "Qwen/Qwen3-0.6B"),
                "epochs_completed": params.get("num_epochs", 1),
                "output_dir": params.get("output_dir", "./output"),
                "train_loss": 0.35, "eval_loss": 0.42,
                "use_lora": params.get("use_lora", False),
            })
        elif action == "create_reward":
            return json.dumps({"reward_type": params.get("reward_type", "accuracy"),
                               "created": True})
        elif action == "evaluate":
            return json.dumps({"accuracy": 0.72, "pass_rate": 0.68,
                               "samples_evaluated": params.get("max_samples", 50)})
        return json.dumps({"error": f"unknown action: {action}"})
