"""工具系统"""

from .base import Tool, ToolParameter, tool_action
from .registry import ToolRegistry, global_registry
from .response import ToolResponse, ToolStatus
from .errors import ToolErrorCode

# 内置工具
from .builtin.calculator import CalculatorTool
from .builtin.file_tools import ReadTool, WriteTool, EditTool, MultiEditTool
from .builtin.todowrite_tool import TodoWriteTool, TodoItem, TodoList
from .builtin.devlog_tool import DevLogTool, DevLogEntry, DevLogStore, CATEGORIES
from .builtin.task_tool import TaskTool
from .builtin.skill_tool import SkillTool

# 子代理机制
from .tool_filter import ToolFilter, ReadOnlyFilter, FullAccessFilter, CustomFilter

# Hello-Agents 教程扩展工具 (第8-11章)
from .memory_tool import MemoryTool
from .rag_tool import RAGTool
from .mcp_tool import MCPTool, MCPClient, MCPServer
from .a2a_tool import A2ATool, A2AServer
from .anp_tool import ANPTool
from .rl_training_tool import RLTrainingTool
from .context_builder import ContextBuilder, ContextConfig
from .note_tool import NoteTool
from .terminal_tool import TerminalTool

# 第12章评估工具 & 搜索工具
from .search_tool import SearchTool
from .evaluation_tools import BFCLEvaluationTool, GAIAEvaluationTool, LLMJudgeTool, WinRateTool

# ToolExecutor — 兼容 ch04 教程的 ToolRegistry 包装器
class ToolExecutor:
    """ch04 教程兼容的 ToolExecutor，内部委托给 ToolRegistry。"""

    def __init__(self):
        self._registry = ToolRegistry()
        self._tools: dict = {}

    def registerTool(self, name: str, description: str, func):
        self._tools[name] = func
        self._registry.register_function(func, name=name, description=description)

    def getTool(self, name: str):
        return self._tools.get(name)

    def getAvailableTools(self) -> str:
        return "\n".join(f"- {n}" for n in self._tools)


# 兼容 ch04/07 教程的独立 search 函数
def search(query: str) -> str:
    """ch04/ch07 教程兼容的搜索函数桩。"""
    return f"[search results for: {query}]"

__all__ = [
    # 基础工具系统
    "Tool",
    "ToolParameter",
    "tool_action",
    "ToolRegistry",
    "global_registry",

    # 工具响应协议
    "ToolResponse",
    "ToolStatus",
    "ToolErrorCode",

    # 内置工具
    "CalculatorTool",
    "ReadTool",
    "WriteTool",
    "EditTool",
    "MultiEditTool",
    "TodoWriteTool",
    "TodoItem",
    "TodoList",
    "DevLogTool",
    "DevLogEntry",
    "DevLogStore",
    "CATEGORIES",
    "TaskTool",
    "SkillTool",

    # 子代理机制
    "ToolFilter",
    "ReadOnlyFilter",
    "FullAccessFilter",
    "CustomFilter",

    # Hello-Agents 教程扩展工具
    "MemoryTool",
    "RAGTool",
    "MCPTool",
    "MCPClient",
    "MCPServer",
    "A2ATool",
    "A2AServer",
    "ANPTool",
    "RLTrainingTool",
    "ContextBuilder",
    "ContextConfig",
    "NoteTool",
    "TerminalTool",

    # 第12章评估工具 & 搜索工具
    "SearchTool",
    "BFCLEvaluationTool",
    "GAIAEvaluationTool",
    "LLMJudgeTool",
    "WinRateTool",

    # ch04/07 教程兼容
    "ToolExecutor",
    "search",
]
