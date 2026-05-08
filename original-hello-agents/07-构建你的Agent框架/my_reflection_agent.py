"""
第七章 构建你的Agent框架 - 自定义 Refletion Agent
展示如何基于框架基类 ReflectionAgent 构建自我反思智能体。
"""
from typing import Optional, Dict
from hello_agents import ReflectionAgent, HelloAgentsLLM, Config

DEFAULT_INITIAL_PROMPT = """你是一个专业的内容创作者。请根据以下要求完成任务。

要求: {task}

请直接输出你的回答，不要包含任何额外的解释。
"""

DEFAULT_REFLECT_PROMPT = """你是一位严格的评审专家。

# 原始任务:
{task}

# 待评审的内容:
{content}

请分析内容的优点和不足，并提出具体的改进建议。
如果内容已经非常完善，回答"无需改进"。
"""

DEFAULT_REFINE_PROMPT = """你是一位专业的内容创作者。请根据评审反馈优化你的内容。

# 原始任务:
{task}

# 评审反馈:
{feedback}

请输出优化后的内容。
"""


class MyReflectionAgent(ReflectionAgent):
    """
    重写的 Reflection Agent - 自我反思与迭代优化智能体
    """

    def __init__(
        self,
        name: str,
        llm: HelloAgentsLLM,
        system_prompt: Optional[str] = None,
        config: Optional[Config] = None,
        max_iterations: int = 3,
        custom_prompts: Optional[Dict[str, str]] = None
    ):
        super().__init__(name, llm, system_prompt, config)
        self.max_iterations = max_iterations

        if custom_prompts:
            self.initial_prompt = custom_prompts.get("initial", DEFAULT_INITIAL_PROMPT)
            self.reflect_prompt = custom_prompts.get("reflect", DEFAULT_REFLECT_PROMPT)
            self.refine_prompt = custom_prompts.get("refine", DEFAULT_REFINE_PROMPT)
        else:
            self.initial_prompt = DEFAULT_INITIAL_PROMPT
            self.reflect_prompt = DEFAULT_REFLECT_PROMPT
            self.refine_prompt = DEFAULT_REFINE_PROMPT

        print(f"✅ {name} 初始化完成，最大迭代次数: {max_iterations}")

    def run(self, task: str, **kwargs) -> str:
        """运行反思迭代流程"""
        print(f"\n🤖 {self.name} 开始处理任务: {task}")

        # 1. 初始生成
        print("\n--- 初始生成 ---")
        initial_prompt = self.initial_prompt.format(task=task)
        current_content = self._call_llm(initial_prompt)
        print(f"初始内容已生成")

        # 2. 迭代反思与优化
        for i in range(self.max_iterations):
            print(f"\n--- 第 {i+1}/{self.max_iterations} 轮反思 ---")

            reflect_prompt = self.reflect_prompt.format(task=task, content=current_content)
            feedback = self._call_llm(reflect_prompt)
            print(f"反馈: {feedback[:200]}...")

            if "无需改进" in feedback:
                print("\n✅ 内容已无需改进，流程终止。")
                break

            refine_prompt = self.refine_prompt.format(task=task, feedback=feedback)
            current_content = self._call_llm(refine_prompt)
            print(f"优化后的内容已生成")

        print(f"\n--- 任务完成 ---")
        return current_content

    def _call_llm(self, prompt: str) -> str:
        """调用LLM"""
        messages = [{"role": "user", "content": prompt}]
        response = self.llm.invoke(messages)
        return response if response else ""
