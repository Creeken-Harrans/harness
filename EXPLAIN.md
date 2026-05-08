# DeepSeek TypeScript Agent Harness — 架构审计与使用说明

## 架构自洽性审计报告 (2026-05-08)

### Canonical 主路径

```
src/main.ts
  └─ src/cli/repl.ts  (薄入口，无手写 readline loop，无旧 runtime)
       ├─ readConfig()                    → src/config/config.ts    (canonical)
       ├─ new MemoryStore(dataDir)        → src/memory.ts
       ├─ new SessionStore(dataDir, id)   → src/session.ts
       ├─ new Terminal(config)            → src/terminal/terminal.ts
       ├─ new Workspace(config.workspace) → src/workspace/workspace.ts
       ├─ new NotesStore(dataDir)         → src/notes/notes.ts
       ├─ new ToolRegistry()              → src/tools/registry.ts
       │    └─ createPhase2CoreTools()    → src/tools/core/index.ts (18 tools)
       ├─ new DeepSeekClient(config)      → src/deepseek/client.ts
       ├─ new ContextManager(config, mem) → src/context.ts
       ├─ new ToolRunner(deps)            → src/tools/runner.ts
       ├─ new AgentRuntime(...)           → src/runtime/runtime.ts
       └─ new AgentRenderer()             → src/cli/renderer.ts

  User input → handleSlashCommand() → if not handled:
    AgentRuntime.run(input) [AsyncGenerator]
      └─ createAgent(config.agent)       → src/agents/index.ts
           └─ Agent.run(input, ctx)
                └─ runAgentLoop(deps, input) → src/runtime/loop.ts
                     ├─ ContextManager.build()  → gather/select/structure
                     ├─ DeepSeekClient.chatStream()
                     ├─ ToolRegistry.exportDeepSeekTools()
                     ├─ ToolRunner.runWithEvents()
                     ├─ TraceWriter → data/traces/{runId}.jsonl
                     └─ TrajectoryRecorder → data/trajectories/{runId}.json
```

**依赖方向**: `cli → runtime → agents → loop → context/deepseek/tools`，无反向依赖。

### 根级兼容文件

| 文件 | 角色 |
|---|---|
| `src/runtime.ts` | re-export `runtime/*` |
| `src/deepseek.ts` | re-export `deepseek/*` |
| `src/config.ts` | re-export `config/*` |
| `src/context.ts` | ContextManager 兼容 wrapper + re-export `context/*` |
| `src/memory.ts` | MemoryStore canonical + re-export |
| `src/session.ts` | SessionStore canonical |
| `src/terminal.ts` | re-export `terminal/*` |
| `src/commands.ts` | re-export `cli/*` |
| `src/types.ts` | re-export 核心类型 |

### 无竞争实现

- **Runtime**: 只有 `AgentRuntime` (AsyncGenerator)。`handleUserInput` / `runOnce` 是兼容层。
- **Tool schema**: 主路径使用 `ToolRegistry.exportDeepSeekTools()`。`src/tools/schema.ts` 已标记 deprecated，无人从主路径引用。
- **Config**: 只有 `src/config/config.ts` 的 `readConfig()`。
- **Shell**: 走 `terminal.runStream()` → `runShellStream()` streaming 路径。

### 修复内容 (本次审计)

1. **`src/runtime/trace.ts`** — 移除重复 redaction 实现 (18行)，改为 `import { redactValue } from "../security/secrets.js"`，使 trace/trajectory/tool-result 三层统一使用同一套 secret pattern 匹配。
2. **`src/context/gather.ts`** — `formatMemories()` 对每个 memory entry text 做 `truncateText(text, 2000)` 截断，防止长 memory 撑爆 context budget。
3. **`src/eval/runner.ts`** — `runCase()` 添加 `try/finally { fs.rmSync(dataDir, ...) }` 清理临时目录。

### 验证结果

```
npm run build     ✓
npm run typecheck ✓
npm run eval      ✓  (6/6 passed, 100%)
```

### 真实接入主路径的能力

| 能力 | 状态 |
|---|---|
| DeepSeek streaming (content/reasoning/tool delta) | 真实 |
| Terminal streaming (live stdout/stderr, bounded observation) | 真实 |
| ToolRegistry (18 tools) + ToolRunner + permissions | 真实 |
| ContextBuilder (gather/select/structure/compress/budget) | 真实 |
| JSON memory store (keyword + CJK bigram search) | 真实 |
| Notes/Todo (data/notes/*.md) | 真实 |
| Trace jsonl + Trajectory json (含 redaction) | 真实 |
| Agent families (simple/react/plan/reflection/coding/research) | 真实 |
| Eval harness (6 cases, rule-based judge) | 真实 |
| Workspace path policy (escape/protected check) | 真实 |
| Approval policy (safe/read 免审批, dangerous 默认拒绝) | 真实 |
| Hard deny shell patterns (rm -rf /, mkfs, dd of=/dev/, etc.) | 真实 |

### Skeleton / TODO (诚实标注)

| 能力 | 状态 |
|---|---|
| SQLite memory | skeleton，所有方法 throw |
| Vector/embedding search | `futureVectorSearchHook.enabled = false` |
| MCP JSON-RPC | 接口 + stdio transport，无 session 管理 |
| A2A remote | local in-process bus only |
| Sandbox | `currentSandboxStatus().enabled = false` |
| PTY | 不存在 |
| LLM-as-judge eval | rule-based judge only |
| ResearchAgent 联网 | instruction 明确标注无 web/search tool |
| Cancellation | `src/runtime/cancellation.ts` 未创建 |

---

## 使用方法

### 环境准备

**安装依赖** — 安装 Node.js TypeScript 工具链:
```bash
npm install
```

**配置 API Key** — 从模板创建 .env 文件并填入 DeepSeek API Key:
```bash
cp .env.example .env
# 编辑 .env，将 DEEPSEEK_API_KEY=sk-your-key-here 替换为真实 key
```

### 运行方式

**开发模式直接运行** — 用 tsx 即时编译运行，无需先 build:
```bash
npm run dev
```

**生产模式运行** — 先编译为 JavaScript，再用 Node.js 运行:
```bash
npm run build
npm start
```

**指定 session 启动** — 不同 session 保存独立的对话历史:
```bash
npm run dev -- --session=my-project
```

**类型检查** — 只检查类型不生成文件:
```bash
npm run typecheck
```

**运行 Eval 测试套件** — 编译后运行 6 个 tool-level 回归用例:
```bash
npm run eval
```

### CLI 斜杠命令

进入 REPL 后支持以下命令 (输入 `/help` 查看完整列表):

| 命令 | 一句话概括 |
|---|---|
| `/help` | 显示所有可用命令列表 |
| `/exit` 或 `/quit` | 退出 REPL |
| `/clear` | 清空当前 session 对话历史 |
| `/remember <text>` | 手动保存一条持久化记忆到 data/memory.json |
| `/mem [query]` | 列出或搜索持久化记忆 |
| `/context` | 显示当前 session/context 统计 (message 数、memory 数、budget 使用情况、上次 context build report) |
| `/model` | 显示当前模型配置 (baseUrl、model、thinking、approvalMode、agent) |
| `/agent [name]` | 查看或切换 agent mode: simple/react/plan/reflection/coding/research |
| `/think [off\|high\|max]` | 查看或切换 DeepSeek thinking/reasoning 模式 |
| `/pwd` | 显示当前 shell workspace 路径 |
| `/sh <command>` | 直接在 workspace 中运行 shell 命令，实时 streaming 输出 |
| `/trace` | 显示 trace 文件写入目录 |
| `/tools` | 列出当前 ToolRegistry 中注册的所有工具 (名称、风险等级、描述) |
| `/notes [file]` | 读取 notes 文件 (NOTES.md/TODO.md/DECISIONS.md/ERRORS.md/PROGRESS.md) |
| `/todo` | 列出当前 todo 列表 |
| `/workspace` | 显示 workspace 策略信息 (root、dataDir、pathPolicy) |
| `/git` | 运行 `git status --short --branch` (只读) |
| `/diff` | 显示 `git diff` (只读) |

### 环境变量配置

所有配置通过 `.env` 文件或环境变量设置:

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | (必填) | DeepSeek API Key，从 platform.deepseek.com 获取 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | 模型名称，可选 deepseek-v4-pro |
| `DEEPSEEK_THINKING` | `disabled` | thinking 模式: enabled/disabled |
| `DEEPSEEK_REASONING_EFFORT` | `high` | reasoning 强度: high/max (仅在 thinking=enabled 时生效) |
| `HARNESS_WORKSPACE` | `.` | shell 和文件工具的工作目录 |
| `HARNESS_DATA_DIR` | `data` | 数据目录 (traces/trajectories/memory/notes/sessions) |
| `HARNESS_APPROVAL_MODE` | `shell` | 审批模式: always/shell/never |
| `HARNESS_MAX_STEPS` | `6` | 每次用户输入的最大 tool-calling 轮数 |
| `HARNESS_CONTEXT_BUDGET` | `24000` | 上下文 token 预算 (按 char/4 估算) |
| `HARNESS_SHELL_TIMEOUT_MS` | `20000` | 每个 shell 命令的超时 (毫秒) |
| `HARNESS_MAX_TOOL_OUTPUT_CHARS` | `12000` | 返回给模型的 tool output 最大字符数 |
| `HARNESS_AGENT` | `simple` | 默认 agent mode |
| `HARNESS_ALLOW_DANGEROUS_TOOLS` | `false` | 是否允许 dangerous 级别工具 |

### Agent Mode

6 种 agent mode，通过 `HARNESS_AGENT` 环境变量或 `/agent` 命令切换:

| Mode | 一句话概括 |
|---|---|
| `simple` | 默认 tool-calling 循环，无额外 system prompt |
| `react` | ReAct 风格 action/observation 循环，通过 prompt 合约约束行为 |
| `plan` | 先输出 plan + 记录 todo，再逐步执行 |
| `reflection` | 完成后再做一次自检，发现明显问题修正一次 |
| `coding` | inspect-first 编码工作流，优先使用 file/git/shell/patch 工具 |
| `research` | 本地文档研究，planner→gather→notes→synthesize→report (明确标注无联网搜索) |

### 工具系统

**风险等级** (决定审批行为):

| 等级 | 审批行为 |
|---|---|
| `safe` | 免审批 |
| `read` | 免审批 |
| `write` | 审批门控 (HARNESS_APPROVAL_MODE=never 时跳过) |
| `shell` | 审批门控 |
| `network` | 审批门控 |
| `dangerous` | 默认拒绝，需 HARNESS_ALLOW_DANGEROUS_TOOLS=true 且审批通过 |

**已注册的工具**:

| 工具名 | 风险 | 说明 |
|---|---|---|
| `shell_exec_stream` | shell | 运行 shell 命令，实时 streaming |
| `shell_exec` | shell | shell_exec_stream 的兼容别名 |
| `read_file` | read | 读取 workspace 内 UTF-8 文本文件 |
| `write_file` | write | 写入 workspace 内文本文件 |
| `edit_file` | write | 在 workspace 内文件中替换文本 (diff-friendly) |
| `list_dir` | read | 列出 workspace 内目录内容 |
| `glob` | read | 按 glob 模式查找 workspace 文件 |
| `grep` | read | 在 workspace 文本文件中搜索 |
| `git_status` | read | 运行 `git status --short --branch` (只读) |
| `git_diff` | read | 显示 `git diff` (只读) |
| `git_log` | read | 显示最近 git commit log (只读) |
| `git_show` | read | 显示 git object/commit (只读) |
| `git_branch` | read | 显示当前 git branch (只读) |
| `apply_patch` | write | 应用 unified diff patch |
| `memory_add` | safe | 保存持久化记忆 |
| `memory_search` | read | 搜索持久化记忆 |
| `memory_list` | read | 列出最近持久化记忆 |
| `session_info` | safe | 获取 session/harness 基本信息 |
| `get_session_info` | safe | session_info 的兼容别名 |
| `note_read` | read | 读取 notes 文件 |
| `note_append` | write | 追加笔记 |
| `todo_add` | write | 添加 todo 项 |
| `todo_list` | read | 列出 todo 项 |
| `todo_update` | write | 更新 todo 项状态 |
| `decision_record` | write | 记录设计决策 |
| `error_record` | write | 记录错误诊断 |
| `progress_record` | write | 记录进度 |

### 安全边界

- **Workspace 限制**: 所有 file/git/patch 工具受 workspace path policy 约束，路径逃逸被拒绝。
- **Protected paths**: `.env`、`.ssh`、`id_rsa`、credential 文件名等默认拒绝读写。
- **Shell 硬拒绝**: `rm -rf /`、`mkfs`、`dd of=/dev/`、`shutdown`、`reboot`、fork bomb 等模式被硬编码拦截。
- **审批门控**: write/shell/network 工具默认需用户审批，dangerous 默认拒绝。
- **Trace redaction**: API key、`sk-*`、`Authorization: Bearer`、PEM private key 等写入 trace/trajectory 前自动脱敏。
- **非 Sandbox**: Shell 运行在 host bash 上，无 Docker/Firecracker/gVisor。仅适合本地开发使用。

### 项目结构速览

```
src/
├── main.ts              # 入口
├── cli/                 # REPL, renderer, slash commands
├── runtime/             # AgentRuntime, runAgentLoop, AgentEvent, trace
├── deepseek/            # DeepSeekClient, SSE stream parser, types
├── config/              # readConfig, env helpers
├── agents/              # simple/react/plan/reflection/coding/research
├── tools/               # Tool interface, registry, runner, permissions, core tools
├── workspace/           # path policy, file store, git, patch
├── context/             # gather, select, structure, compress, budget, builder
├── memory/              # MemoryStoreInterface, JsonMemoryStore, SqliteMemoryStore (skeleton)
├── notes/               # NotesStore, TodoStore, decisions, errors
├── messages/            # ChatMessage, ToolCall, serializers, Transcript
├── terminal/            # bash spawn streaming, BoundedCapture
├── security/            # ApprovalPolicy, redaction, audit, sandbox status
├── eval/                # eval runner, cases, judge, metrics
├── trajectories/        # TrajectoryRecorder, exporter
├── mcp/                 # MCP client interface, stdio transport, tool adapter (skeleton)
└── a2a/                 # local agent bus, agent card, protocol notes (skeleton)

data/                    # 运行时数据 (traces/, trajectories/, memory.json, notes/, sessions/, audit/)
evals/cases/             # eval 用例 (basic-tools.jsonl)
docs/                    # ARCHITECTURE, SAFETY, STREAMING, TOOL_PROTOCOL, CONTEXT_ENGINEERING, MEMORY, EVALS, ROADMAP
```

### 关键设计决策

1. **DeepSeek-first**: 不引入 OpenAI/Anthropic/Qwen provider 抽象。主模型客户端只有 `DeepSeekClient`。
2. **AsyncGenerator 驱动**: 整个 runtime 使用 AsyncGenerator，CLI 逐 event 消费，实现真正的 streaming 端到端。
3. **ToolResult → model observation 截断**: 用户看到完整 live stdout/stderr，但模型只收到 bounded structured summary，防止 context 被无限 log 撑爆。
4. **Prompt-contract agent modes**: 所有 agent mode 通过 system prompt 指令合约实现，而非硬编码状态机。ReAct/Plan/Reflection 都是 prompt 指令 + runLoop 委托。
5. **兼容层策略**: 根级 `.ts` 文件 (runtime.ts, deepseek.ts 等) 是 re-export 层，保持向后兼容，主逻辑都在子目录中。
6. **Eval 不消耗 API**: 当前 eval cases 是 tool-level 回归测试，直接调用 ToolRunner，不经过 DeepSeek API。适合 CI 使用。
