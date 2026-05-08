# 第七章 构建你的 Agent 框架

## 原教程讲了什么

从零开始设计并实现一个 Agent 框架，包括架构设计、工具系统、记忆管理、多 Agent 协作。

## 本 Harness 如何映射

这一章是 hello-agents 的核心实践章节，也是本 harness **直接对应的章节**。本 harness 本身就是"第七章"的完整实现。以下逐个子系统对照：

| 第七章主题 | 本 Harness 实现 |
|---|---|
| 框架架构设计 | `EXPLAIN.md` 中的 canonical 主路径图 |
| 工具系统 | `src/tools/` — Tool 接口 + Registry + Runner + Permissions |
| 记忆管理 | `src/memory.ts` (MemoryStore) + `src/memory/` (接口层) + `src/notes/` (任务状态) |
| Agent 调度 | `AgentRuntime.run()` + `createAgent()` + `runAgentLoop()` |
| 上下文管理 | `src/context/` — Builder + Gather + Select + Structure + Compress + Budget |
| 通信协议 | `src/mcp/` + `src/a2a/` (skeleton) |
| 评估系统 | `src/eval/` — runner + cases + judge + metrics |

## 原理解析：设计一个 Agent 框架的三个核心问题

hello-agents 第七章教你从零搭建框架。在这个过程中，有三个最核心的设计问题，本 harness 的回答如下：

### 问题 1: 控制流是怎样的？

**回答**: 单一 AsyncGenerator 流，而非回调/事件总线/PubSub。

```
CLI → AgentRuntime.run() → createAgent().run() → runAgentLoop()
  → for (steps) {
      yield* client.chatStream()   // 模型输出事件
      yield* toolRunner.runWithEvents()  // 工具执行事件
    }
  → return AgentResult
```

所有行为收敛到一条生成器链上。CLI renderer、TraceWriter、TrajectoryRecorder 都是这同一条流的消费者。不需要 EventEmitter、不需要 RxJS、不需要 Promise.race。

### 问题 2: 如何表达 Agent 的多样性？

**回答**: prompt-contract，而非子类继承。

6 种 agent mode 都实现同一个 `Agent` 接口，差异仅在于传给 `runLoop` 的 system instruction 不同。这利用了 LLM 的核心能力——**遵循自然语言指令**——而不是在代码层面维护多个状态机。

### 问题 3: 安全和可观测性是事后补的吗？

**回答**: 不是。它们内建在核心 loop 中，而非"插件"。

- `TraceWriter` 在 `runAgentLoop` 的第一行创建
- `TrajectoryRecorder` 在创建后立即开始 observe
- `ApprovalPolicy` 在 `ToolRunner.runWithEvents()` 内部，在任何 tool 执行前触发
- `WorkspacePathPolicy` 在 `WorkspaceFileStore` 的每个读写操作中执行
- `redactValue` 在 trace、trajectory、tool-result 三层执行

**不是**"先跑通，再加安全"。安全/可观测性从一开始就在控制流中。

## 操作指南

### 从零理解框架组装

阅读顺序建议（按调用链从入口到出口）：

```
 1. src/main.ts                  (8 行，入口)
 2. src/cli/repl.ts              (75 行，组装线)
 3. src/runtime/runtime.ts       (68 行，AgentRuntime)
 4. src/runtime/loop.ts          (208 行，核心 loop)
 5. src/agents/index.ts          (28 行，agent 工厂)
 6. src/agents/simple-agent.ts   (12 行，最简单的 agent)
 7. src/tools/tool.ts            (65 行，Tool 接口)
 8. src/tools/registry.ts        (48 行，注册中心)
 9. src/tools/runner.ts          (208 行，执行引擎)
10. src/context/builder.ts       (57 行，上下文构建)
11. src/deepseek/client.ts       (94 行，模型客户端)
```

这 11 个文件约 860 行，构成了框架的核心骨架。读完它们，你就理解了整个 Agent 框架的运作方式。

### 扩展框架：添加新 Agent Mode

```typescript
// src/agents/debug-agent.ts
import type { Agent, AgentContext } from "./agent.js";
import { agentInput } from "./agent.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class DebugAgent implements Agent {
  name = "debug";
  description = "Debug mode that logs every tool call with full detail.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    const instruction = [
      "Debug mode: be extremely verbose about tool calls.",
      "After each tool call, explain what was done, what was observed, and what's next.",
    ].join("\n");
    return ctx.runLoop(agentInput(instruction, input));
  }
}
```

然后在 `src/agents/index.ts` 中注册：

```typescript
case "debug": return new DebugAgent();
```

以及在 `src/config/config.ts` 的类型中添加 `"debug"` 到 `HarnessAgentName`。

这就是整个扩展流程——不需要修改 loop、不需要修改 runtime、不需要碰 tool 系统。

## 超越原教程

| hello-agents 第七章 | 本 harness |
|---|---|
| 教学型框架骨架 | 工程级、可直接运行的框架 |
| Python 同步实现 | TypeScript AsyncGenerator 全链路 streaming |
| 无安全机制 | 内建 path policy / approval gate / hard deny / redaction |
| 无可观测性 | 内建 trace jsonl + trajectory json |
| 无评估 | 内建 eval runner + 6 cases |
| 单一 agent | 6 种 agent mode 可切换 |

## 关键文件

| 文件 | 作用 |
|---|---|
| `EXPLAIN.md` | 完整架构审计报告 + 使用说明 |
| `docs/ARCHITECTURE.md` | 架构文档 |
| 上面列出的 11 个核心文件 | 框架骨架 |
