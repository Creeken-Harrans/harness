"""
第七章 构建你的Agent框架 - 自定义 Plan-Solve Agent
展示如何基于框架构建先规划后执行的智能体。
"""
from typing import Optional, List
from hello_agents import HelloAgentsLLM, Config, Message

PLANNER_PROMPT = """你是一个顶级的AI规划专家。你的任务是将用户提出的复杂问题分解成一个由多个简单步骤组成的行动计划。
请确保计划中的每个步骤都是一个独立的、可执行的子任务，并且严格按照逻辑顺序排列。

问题: {question}

请输出一个步骤列表，每行一个步骤，格式为：
步骤1: xxx
步骤2: xxx
...
"""

EXECUTOR_PROMPT = """你是一位顶级的AI执行专家。请按照计划逐步解决问题。

# 原始问题:
{question}

# 完整计划:
{plan}

# 已完成步骤:
{history}

# 当前步骤:
{current_step}

请仅输出针对"当前步骤"的回答:
"""


class MyPlanAndSolveAgent:
    """
    重写的 Plan-and-Solve Agent - 先规划后执行的智能体
    """

    def __init__(
        self,
        name: str,
        llm: HelloAgentsLLM,
        system_prompt: Optional[str] = None,
        config: Optional[Config] = None
    ):
        self.name = name
        self.llm = llm
        self.system_prompt = system_prompt
        self.config = config
        self._history: List[Message] = []
        print(f"✅ {name} 初始化完成")

    def run(self, question: str, **kwargs) -> str:
        """运行 Plan-and-Solve 流程"""
        print(f"\n🤖 {self.name} 开始处理问题: {question}")

        # 1. 生成计划
        print("\n--- 生成计划 ---")
        plan_prompt = PLANNER_PROMPT.format(question=question)
        plan_text = self._call_llm(plan_prompt)
        plan = self._parse_plan(plan_text)
        print(f"计划: {plan}")

        # 2. 逐步执行
        print("\n--- 执行计划 ---")
        history = ""
        final_answer = ""

        for i, step in enumerate(plan, 1):
            print(f"\n步骤 {i}/{len(plan)}: {step}")
            exec_prompt = EXECUTOR_PROMPT.format(
                question=question,
                plan="\n".join([f"{j}. {s}" for j, s in enumerate(plan, 1)]),
                history=history if history else "无",
                current_step=step
            )
            answer = self._call_llm(exec_prompt)
            history += f"步骤 {i}: {step}\n结果: {answer}\n\n"
            final_answer = answer
            print(f"结果: {final_answer[:200]}...")

        self._history.append(Message(question, "user"))
        self._history.append(Message(final_answer, "assistant"))

        print(f"\n--- 任务完成 ---")
        return final_answer

    def _call_llm(self, prompt: str) -> str:
        """调用LLM"""
        messages = [{"role": "user", "content": prompt}]
        response = self.llm.invoke(messages)
        return response.content if response else ""

    def _parse_plan(self, plan_text: str) -> List[str]:
        """解析计划文本为步骤列表"""
        steps = []
        for line in plan_text.strip().split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("步骤")):
                # 移除编号前缀
                import re
                cleaned = re.sub(r'^(步骤)?\s*\d+[\.:、]\s*', '', line)
                if cleaned:
                    steps.append(cleaned)
        return steps if steps else [plan_text[:100]]

    def get_history(self) -> List[Message]:
        """获取对话历史"""
        return self._history

    def add_message(self, message: Message):
        """添加消息到历史"""
        self._history.append(message)
