# Architecture

这个项目是一个 mini agent harness。它不是模型本身，而是围绕模型做：

- 输入输出管理
- memory 注入
- session 持久化
- tool schema 暴露
- tool call 执行
- terminal approval
- context trimming

## 1. Harness 是什么

可以把 harness 理解成：

> 大语言模型 LLM 的本地运行外壳。它不只是调用 API，而是决定模型看见什么、能做什么、怎么记忆、怎么调用工具、怎么把行动结果反馈给模型。

核心 loop：

```text
user input
  ↓
ContextManager builds messages
  ↓
DeepSeek chat completion
  ↓
assistant final answer? ── yes → print
  ↓ no
assistant tool_calls
  ↓
ToolRunner executes tools
  ↓
tool results appended
  ↓
DeepSeek chat completion again
```

这就是 `src/runtime.ts`。

## 2. 和 OpenClaw/Hermes 的对应关系

| 大型 agent 概念 | 本项目里的极简对应 |
|---|---|
| Gateway / control plane | `main.ts` + `runtime.ts` |
| Session lifecycle | `session.ts` |
| Persistent memory | `memory.ts` |
| Context files / SOUL | `SOUL.md` + `context.ts` |
| Tools | `tools/schema.ts` |
| Tool executor | `tools/runner.ts` |
| Terminal backend | `terminal.ts` |
| Approval / safety | `HARNESS_APPROVAL_MODE` + hard deny regex |
| Context optimization | `context.ts` approximate token budget |

## 3. 为什么不直接把所有历史都塞给模型

因为真实 agent 会遇到 context window 限制。简单粗暴把所有历史放进去会导致：

1. 成本上升。
2. 延迟变长。
3. 超过上下文长度。
4. 旧信息干扰当前任务。
5. 旧 tool messages 跨轮使用可能违反 API message structure。

所以本项目采用：

- 长期事实进入 `memory.json`
- 短期对话进入 `sessions/<id>.json`
- 每轮只取相关 memory + 最近 user/assistant 文本

## 4. 为什么 tool calls 要经过 ToolRunner

模型不能直接执行代码。模型只能输出结构化意图：

```json
{
  "name": "shell_exec",
  "arguments": "{\"command\":\"ls -la\"}"
}
```

真正执行的是本地程序 `ToolRunner`。这就是安全边界：

- 模型提出动作
- harness 检查动作
- 用户批准动作
- harness 执行动作
- harness 把结果返回模型

## 5. 为什么默认禁用 thinking

DeepSeek thinking mode 会返回 `reasoning_content`。当 thinking mode 与 tool calls 一起使用时，API 文档要求在后续工具轮中保留 reasoning content。这个项目在当前工具轮里会保留 raw assistant message，因此可以工作；但作为教学项目，默认禁用 thinking 更稳定。

如果你想打开：

```bash
DEEPSEEK_THINKING=enabled
DEEPSEEK_REASONING_EFFORT=high
```

## 6. 最小实现的局限

- memory 是 JSON，不适合大量数据。
- search 是关键词，不是 embedding。
- terminal 只是 regex 拦截，不是强 sandbox。
- 没有文件 patch 工具。
- 没有多 agent。
- 没有 messaging gateway。
- 没有 scheduled automation。

但它已经包含 agent harness 最核心的骨架。
