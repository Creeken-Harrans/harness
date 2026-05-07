# DeepSeek Mini Harness

一个极简但真实可运行的 TypeScript agent harness：

- DeepSeek API 调用（OpenAI-compatible `/chat/completions`）
- 持久化记忆（persistent memory）：`data/memory.json`
- 会话上下文管理（context management）：自动裁剪历史，只把相关记忆注入 prompt
- 终端工具（terminal tool）：模型可请求 `shell_exec`，默认需要你批准
- 交互式 CLI REPL：普通聊天 + `/sh`、`/remember`、`/mem` 等命令
- 类 OpenClaw/Hermes 的最小思想：local-first、session、memory、tool-use、approval、context files

> 这不是完整 OpenClaw/Hermes 复刻，而是为了学习 harness 架构的最小可运行骨架。

---

## 1. 快速开始

```bash
unzip deepseek-mini-harness.zip
cd deepseek-mini-harness
npm install
cp .env.example .env
```

编辑 `.env`：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

开发模式运行：

```bash
npm run dev
```

或者构建后运行：

```bash
npm run build
npm start
```

指定 session：

```bash
npm run dev -- --session=paper-repro
```

---

## 2. 常用命令

在 REPL 里输入：

```text
/help                 查看命令
/exit                 退出
/clear                清空当前 session 历史
/remember <text>      手动保存一条长期记忆
/mem [query]          查看或搜索记忆
/context              查看上下文统计
/model                查看模型配置
/pwd                  查看 shell 工作目录
/sh <command>         直接运行 shell 命令
```

普通文本会发送给 DeepSeek，并自动带上：

1. system prompt
2. `SOUL.md` 内容
3. 相关 persistent memory
4. 裁剪后的近期对话历史

---

## 3. 目录结构

```text
deepseek-mini-harness/
├── src/
│   ├── main.ts              # CLI 入口，REPL 主循环
│   ├── config.ts            # .env 加载与配置
│   ├── deepseek.ts          # DeepSeek Chat API 客户端
│   ├── runtime.ts           # agent loop：模型 -> 工具 -> 模型
│   ├── context.ts           # 上下文裁剪、记忆注入、SOUL.md 注入
│   ├── memory.ts            # JSON persistent memory
│   ├── session.ts           # JSON session history
│   ├── terminal.ts          # shell 执行器与危险命令拦截
│   ├── commands.ts          # /help /sh /mem 等 REPL 命令
│   └── tools/
│       ├── schema.ts        # OpenAI-compatible tool definitions
│       └── runner.ts        # tool call 执行逻辑
├── docs/
│   ├── ARCHITECTURE.md      # 架构解释
│   └── SAFETY.md            # 安全边界
├── data/
│   └── sessions/            # 运行后保存 session
├── SOUL.md                  # 类 Hermes/OpenClaw 的上下文/人格文件
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 4. DeepSeek 配置说明

当前 `.env.example` 默认：

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_THINKING=disabled
```

如果你想用更强模型：

```bash
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_THINKING=enabled
DEEPSEEK_REASONING_EFFORT=high
```

注意：thinking mode 打开后，模型可能返回 `reasoning_content`。本 harness 在当前工具调用轮里会保留原始 assistant message，因此基本能跑 tool loop；但为了初学和稳定，默认关闭 thinking。

---

## 5. 记忆机制

记忆文件在：

```text
data/memory.json
```

手动保存：

```text
/remember 我正在学习 TypeScript harness，希望解释尽量从架构角度展开。
```

模型也能调用 `memory_add` 工具，但 system prompt 要求它只保存稳定、长期、有用的信息。

搜索：

```text
/mem typescript
```

实现上不是向量数据库，而是一个很小的 keyword + Chinese bigram 检索器。优点是透明、无需额外依赖；缺点是语义检索能力有限。

---

## 6. 上下文管理

`ContextManager` 会做三件事：

1. 读取 `SOUL.md`。
2. 根据当前用户输入搜索相关 memory。
3. 从最近会话里选择可放入 token budget 的 user/assistant 文本。

为了避免 OpenAI-compatible API 报错，历史里的旧 tool message 不会跨轮直接塞回模型。当前这一轮的 tool calls 会完整保留。

---

## 7. 终端工具

模型可调用：

```ts
shell_exec({ command: "ls -la" })
```

默认 `HARNESS_APPROVAL_MODE=shell`，模型请求 shell 命令时你会看到：

```text
Model wants to run shell command:
  ls -la
Approve? [y/N]
```

直接 `/sh ls -la` 是用户显式命令，会直接运行，但仍会经过硬拦截规则，例如阻止：

- `rm -rf /`
- `mkfs`
- `shutdown`
- fork bomb
- 部分明显破坏性命令

这只是学习级安全，不是强 sandbox。真正生产级 agent 应使用 Docker、Firecracker、gVisor、SSH jail 或专用 sandbox。

---

## 8. 你可以继续加什么

适合下一步扩展：

1. SQLite + FTS5 memory，替代 JSON memory。
2. embedding / vector memory，做语义召回。
3. Git 工具：`git_status`、`git_diff`、`git_apply_patch`。
4. 文件工具：受控 `read_file`、`write_file`，带路径白名单。
5. sandbox：Docker backend。
6. skills：把常用工作流变成 `skills/<name>/SKILL.md`。
7. model provider 抽象：DeepSeek / OpenAI / Anthropic / OpenRouter 可切换。
8. trajectory export：把每轮 message/tool/result 存成训练数据。

---

## 9. 学习重点

这套代码最应该读的顺序：

1. `src/main.ts`：CLI 怎么启动。
2. `src/runtime.ts`：harness 的核心 agent loop。
3. `src/tools/schema.ts`：工具如何暴露给模型。
4. `src/tools/runner.ts`：模型请求如何变成真实动作。
5. `src/context.ts`：上下文如何组装。
6. `src/memory.ts`：记忆如何存储和检索。
7. `src/terminal.ts`：终端执行与安全拦截。

