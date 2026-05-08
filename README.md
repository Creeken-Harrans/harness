# DeepSeek Mini Harness

一个 TypeScript-first、DeepSeek-first 的本地 agent harness。当前完成的是 Phase 1：streaming runtime foundation。

- DeepSeek API 调用（OpenAI-compatible `/chat/completions`）
- DeepSeek 流式输出（content / reasoning_content / tool_call delta）
- 事件驱动 runtime：`AgentEvent` 统一承载 LLM delta、tool stdout/stderr、trace、error、done
- 终端工具：模型可请求 `shell_exec`，stdout/stderr 实时显示，默认需要批准
- 持久化记忆：`data/memory.json`
- 会话上下文管理：`SOUL.md` + 相关 memory + 裁剪后的近期对话
- trace 记录：`data/traces/<run-id>.jsonl`
- 交互式 CLI REPL：普通聊天 + `/sh`、`/remember`、`/mem` 等命令

这不是 hello-agents Python 代码移植，而是把 agent harness 的核心思想用 TypeScript 重新工程化。DeepSeek 仍然是唯一主模型客户端。

## Quick Start

```bash
npm install
cp .env.example .env
```

编辑 `.env`：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

开发模式：

```bash
npm run dev
```

构建后运行：

```bash
npm run build
npm start
```

指定 session：

```bash
npm run dev -- --session=paper-repro
```

## Commands

```text
/help                 查看命令
/exit                 退出
/clear                清空当前 session 历史
/remember <text>      手动保存一条长期记忆
/mem [query]          查看或搜索记忆
/context              查看上下文统计
/model                查看模型配置
/pwd                  查看 shell 工作目录
/sh <command>         直接运行 shell 命令，实时显示 stdout/stderr
```

普通文本会发送给 DeepSeek，并自动带上 system prompt、`SOUL.md`、相关 persistent memory 和裁剪后的近期对话。

## Structure

```text
harness/
├── src/
│   ├── main.ts
│   ├── cli/                 # REPL、renderer、slash commands
│   ├── config/              # .env 加载与配置
│   ├── deepseek/            # DeepSeek client 与 SSE parser
│   ├── runtime/             # AgentEvent、streaming loop、trace
│   ├── terminal/            # shell streaming backend
│   ├── messages/            # message types and serializers
│   ├── context.ts           # 当前兼容 ContextManager
│   ├── memory.ts            # 当前 JSON memory
│   ├── session.ts           # 当前 JSON session history
│   ├── tools/
│   │   ├── schema.ts
│   │   └── runner.ts        # Phase 2 会迁移到 ToolRegistry
│   ├── config.ts            # compatibility re-export
│   ├── deepseek.ts          # compatibility re-export
│   ├── runtime.ts           # compatibility re-export
│   ├── terminal.ts          # compatibility re-export
│   └── commands.ts          # compatibility re-export
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SAFETY.md
│   └── STREAMING.md
├── data/
│   ├── sessions/
│   └── traces/
├── SOUL.md
├── .env.example
├── package.json
└── tsconfig.json
```

## DeepSeek Config

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_THINKING=disabled
DEEPSEEK_REASONING_EFFORT=high
HARNESS_DATA_DIR=data
HARNESS_CONTEXT_BUDGET=24000
HARNESS_MAX_STEPS=6
HARNESS_APPROVAL_MODE=shell
HARNESS_WORKSPACE=.
HARNESS_SHELL_TIMEOUT_MS=20000
HARNESS_MAX_TOOL_OUTPUT_CHARS=12000
```

`HARNESS_MAX_CONTEXT_TOKENS` 仍然作为旧配置名兼容。

## Terminal Tool

模型可调用：

```ts
shell_exec({ command: "ls -la" })
```

默认 `HARNESS_APPROVAL_MODE=shell`，模型请求 shell 命令时会先询问批准。直接 `/sh ls -la` 是用户显式命令，会实时显示 stdout/stderr，但仍会经过硬拦截规则，例如阻止 `rm -rf /`、`mkfs`、`shutdown`、fork bomb 等明显破坏性命令。

这只是学习级安全，不是强 sandbox。真正生产级 agent 应使用 Docker、Firecracker、gVisor、SSH jail 或专用 sandbox。

## Next Phases

1. Tool registry：把当前硬编码 `ToolRunner` 迁移成统一 `Tool` interface。
2. Workspace-aware 文件/Git/Patch 工具：受控 `read_file`、`write_file`、`git_status`。
3. Context builder：Gather / Select / Structure / Compress。
4. Memory / notes / trajectory：长期任务状态和训练数据基础。
5. Agent families：ReAct / Plan-Execute / Reflection / Coding / Research。
6. MCP / A2A / eval harness：协议扩展点和回归评测。
