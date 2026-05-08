"""
第十六章 毕业设计 —— 智能代码审查助手 (CodeReviewAgent)

一个完整的多智能体应用，整合了教程前15章的核心知识：
- 第四章: ReAct 范式
- 第七章: 自定义 Agent 框架
- 第八章: 记忆系统（MemoryTool）
- 第十章: 多智能体协作
- 第十二章: 性能评估

功能: 自动分析代码质量、发现潜在 bug、提出优化建议、生成审查报告。
"""
import os
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()


# ==============================================================================
# 工具模块 — 代码静态分析
# ==============================================================================

CODE_QUALITY_PROMPT = """你是一位资深代码审查专家。请分析以下代码的质量问题：

代码:
```python
{code}
```

请从以下维度分析：
1. 代码风格与命名规范（PEP 8）
2. 潜在bug与逻辑错误
3. 性能优化建议
4. 安全性问题（SQL注入、XSS、路径遍历等）
5. 最佳实践与设计模式

请输出结构化的审查结果。
"""

SECURITY_SCAN_PROMPT = """你是一位安全审计专家。请扫描以下代码的安全漏洞：

代码:
```python
{code}
```

检查项：SQL注入、XSS、命令注入、路径遍历、不安全的反序列化、
硬编码密钥、不安全的随机数、缺少输入验证等。

请列出所有发现的安全问题及修复建议。
"""

OPTIMIZATION_PROMPT = """你是一位性能优化专家。请分析以下代码的性能：

代码:
```python
{code}
```

请分析：时间复杂度、空间复杂度、瓶颈所在、优化方案。

如果代码在算法层面已是最优，回答"无需优化"。
"""

REPORT_PROMPT = """你是一位技术报告撰写专家。请根据以下审查结果，生成一份专业的代码审查报告。

# 代码质量分析:
{quality_result}

# 安全扫描结果:
{security_result}

# 性能分析:
{optimization_result}

# 原始代码:
```python
{code}
```

请生成一份结构化的 Markdown 格式审查报告，包含：总览、问题列表（按严重程度排序）、改进建议、优化后代码示例。
"""


class CodeReviewAgent:
    """
    智能代码审查助手 —— 多Agent协作系统

    采用 Plan-and-Solve + Reflection 混合范式：
    1. Planner: 分析代码特征，制定审查计划
    2. Quality Reviewer: 代码质量审查
    3. Security Reviewer: 安全漏洞扫描
    4. Performance Reviewer: 性能分析
    5. Report Generator: 整合结果生成报告
    """

    def __init__(self, llm_client):
        self.llm = llm_client
        self.review_history: List[Dict] = []

    def review(self, code: str, language: str = "python") -> str:
        """执行完整的代码审查流程"""
        print(f"\n{'='*60}")
        print(f"🔍 智能代码审查助手 — 开始审查 ({language})")
        print(f"{'='*60}")

        # Step 1: 代码质量审查
        print("\n📋 Step 1/4: 代码质量分析...")
        quality_result = self._call_llm(CODE_QUALITY_PROMPT.format(code=code))

        # Step 2: 安全扫描
        print("\n🔒 Step 2/4: 安全漏洞扫描...")
        security_result = self._call_llm(SECURITY_SCAN_PROMPT.format(code=code))

        # Step 3: 性能分析
        print("\n⚡ Step 3/4: 性能优化分析...")
        optimization_result = self._call_llm(OPTIMIZATION_PROMPT.format(code=code))

        # Step 4: 生成综合报告
        print("\n📝 Step 4/4: 生成审查报告...")
        report = self._call_llm(REPORT_PROMPT.format(
            quality_result=quality_result,
            security_result=security_result,
            optimization_result=optimization_result,
            code=code
        ))

        # 保存审查历史
        self.review_history.append({
            "code_snippet": code[:200],
            "language": language,
            "quality": quality_result[:500],
            "security": security_result[:500],
            "optimization": optimization_result[:500],
        })

        print(f"\n{'='*60}")
        print("✅ 审查完成！")
        print(f"{'='*60}")
        return report

    def _call_llm(self, prompt: str) -> str:
        """调用LLM"""
        messages = [{"role": "user", "content": prompt}]
        try:
            return self.llm.think(messages=messages) or ""
        except Exception as e:
            return f"LLM调用失败: {e}"

    def get_review_history(self) -> List[Dict]:
        """获取审查历史"""
        return self.review_history


# ==============================================================================
# 示例代码（用于测试审查功能）
# ==============================================================================

SAMPLE_CODE_BAD = '''
import os

def get_user(name):
    query = "SELECT * FROM users WHERE name = '" + name + "'"
    result = db.execute(query)
    return result

def process_data(data):
    result = []
    for i in range(len(data)):
        for j in range(len(data)):
            if data[i] == data[j] and i != j:
                result.append(data[i])
    return result

def save_file(filename, content):
    path = "/tmp/" + filename
    with open(path, "w") as f:
        f.write(content)

PASSWORD = "admin123"

def login(user, pw):
    if user == "admin" and pw == PASSWORD:
        return True
    return False
'''

SAMPLE_CODE_GOOD = '''
"""User management module with parameterized queries and input validation."""
import os
import hashlib
import secrets
from pathlib import Path
from typing import Optional, List


def get_user(name: str) -> Optional[dict]:
    """Get user by name using parameterized query."""
    query = "SELECT * FROM users WHERE name = ?"
    result = db.execute(query, (name,))
    return result.fetchone()


def process_data(data: List) -> List:
    """Find duplicate items in data using set for O(n) complexity."""
    seen = set()
    duplicates = set()
    for item in data:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    return list(duplicates)


def save_file(filename: str, content: str) -> bool:
    """Save content to a sanitized file path."""
    safe_name = Path(filename).name  # Prevent path traversal
    path = Path("/tmp") / safe_name
    try:
        path.write_text(content)
        return True
    except OSError:
        return False


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify password against stored hash."""
    computed = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 100000
    ).hex()
    return secrets.compare_digest(computed, stored_hash)
'''


# ==============================================================================
# 主程序
# ==============================================================================

if __name__ == "__main__":
    from openai import OpenAI

    # 初始化 LLM 客户端
    api_key = os.getenv("DEEPSEEK_API_KEY", "your-api-key")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model_id = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    class _LLMWrapper:
        """简单的LLM包装器，兼容教程中的HelloAgentsLLM接口"""
        def __init__(self):
            self.model = model_id
            self.client = OpenAI(api_key=api_key, base_url=base_url)

        def think(self, messages, temperature=0):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                stream=True,
            )
            collected = []
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    print(text, end="", flush=True)
                    collected.append(text)
            print()
            return "".join(collected)

    llm = _LLMWrapper()
    agent = CodeReviewAgent(llm)

    # 审查示例代码
    print("=" * 60)
    print("审查包含常见问题的代码:")
    print("=" * 60)
    report = agent.review(SAMPLE_CODE_BAD)

    print("\n\n" + "=" * 60)
    print("📄 最终审查报告:")
    print("=" * 60)
    print(report)
