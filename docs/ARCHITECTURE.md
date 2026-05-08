# Architecture

这个仓库正在从 DeepSeek Mini Harness 迁移为 TypeScript-first Agent Harness Runtime。核心定位保持不变：

- DeepSeek 是唯一主模型 API 层。
- API message/tool schema 保持 OpenAI-compatible，因为 DeepSeek 本身兼容这类格式。
- 不引入重型 ModelProvider 抽象。
- Python/Rust 只作为未来辅助 worker，不是第一阶段主 runtime。

## Current Phase

Phase 1 已落地 streaming runtime foundation：

- `src/deepseek/client.ts`：DeepSeek `chatOnce` / `chatStream`。
- `src/deepseek/stream.ts`：SSE parser，解析 `content`、`reasoning_content`、`tool_calls` delta。
- `src/runtime/events.ts`：统一 `AgentEvent`。
- `src/runtime/loop.ts`：模型 -> 工具 -> 模型的事件驱动 loop。
- `src/terminal/stream.ts`：Node `spawn` stdout/stderr 实时 streaming。
- `src/runtime/trace.ts`：`data/traces/<run-id>.jsonl` trace。
- `src/cli/renderer.ts`：实时渲染 LLM delta 和 terminal output。

旧顶层文件如 `src/deepseek.ts`、`src/runtime.ts`、`src/terminal.ts` 保留为 compatibility re-export，避免一次性破坏现有 import。

## Harness Loop

```text
user input
  ↓
ContextManager builds messages
  ↓
DeepSeekClient.chatStream
  ↓
AgentEvent: llm_delta / llm_reasoning_delta / tool_call_delta
  ↓
assistant final? ── yes → AgentEvent(done)
  ↓ no
ToolRunner executes tool
  ↓
AgentEvent: tool_stdout / tool_stderr / tool_call_end
  ↓
tool result appended as tool message
  ↓
DeepSeekClient.chatStream again
```

Terminal stdout/stderr is streamed live to the CLI. The observation written back to the model is a structured JSON result with bounded stdout/stderr capture.

## hello-agents Mapping

| hello-agents idea | This harness boundary |
|---|---|
| 自研 Agent Runtime | `src/runtime/*` |
| ReAct loop | current model/tool/model loop, later `src/agents/react-agent.ts` |
| Plan-and-Solve | future `src/agents/plan-execute-agent.ts` |
| Reflection | future `src/agents/reflection-agent.ts` |
| Context Engineering | current `src/context.ts`, future `src/context/*` |
| Memory / RAG | current JSON `src/memory.ts`, future `src/memory/*` and `python/rag` |
| MCP tools | future `src/mcp/*` adapter into ToolRegistry |
| A2A / multi-agent | future `src/a2a/*` local bus |
| Agentic RL trajectories | future `src/trajectories/*` export |
| Evaluation harness | future `src/eval/*` |

## Migration Policy

当前代码保留能跑的旧模块，逐步拆分：

- 保留：`context.ts`、`memory.ts`、`session.ts`、`tools/schema.ts`。
- 已迁移并保留兼容层：`config.ts`、`deepseek.ts`、`runtime.ts`、`terminal.ts`、`commands.ts`。
- 下一阶段拆分：`tools/runner.ts` 到 ToolRegistry，随后 workspace-aware file/git/patch tools。

## Limits

- 当前 shell safety 仍是 approval + hard deny regex，不是强 sandbox。
- 当前 tool runner 仍有硬编码 switch，Phase 2 会迁移到 registry。
- 当前 context builder 仍是旧 `ContextManager`，Phase 4 会拆成 Gather / Select / Structure / Compress。
- 当前 trace 不记录 API key，并做基础 redaction；后续会加入审计日志和 trajectory export。
