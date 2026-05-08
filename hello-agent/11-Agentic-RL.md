# 第十一章 Agentic-RL

## 原教程讲了什么

Agentic Reinforcement Learning 的概念：如何用强化学习训练 Agent 的决策能力，轨迹收集、奖励设计、策略优化。

## 本 Harness 如何映射

本 harness **不做训练**。但它为 Agentic RL 提供了最关键的工程基础：**结构化轨迹导出**。

核心文件：

- `src/trajectories/trajectory.ts` — `AgentTrajectory` 类型 + 事件摘要
- `src/trajectories/exporter.ts` — `TrajectoryRecorder`，收集事件并写 JSON
- `src/runtime/trace.ts` — `TraceWriter`，逐事件写 jsonl

## 原理解析：轨迹是 RL 的基础设施

Agentic RL 的训练流程（简化）：

```
1. Agent 执行任务 → 产生轨迹
2. 轨迹标注（reward / preference）
3. 轨迹清洗（去噪、脱敏、格式化）
4. 策略优化（RLHF / DPO / GRPO）
```

本 harness 完成了第 1 步的工程化实现，为第 2-4 步提供了清晰的数据格式。

### Trajectory 结构

`src/trajectories/trajectory.ts` 定义了 `AgentTrajectory`：

```typescript
export type AgentTrajectory = {
  runId: string;
  startedAt: string;
  endedAt?: string;
  userInput: string;
  selectedContextSummary?: unknown;
  modelMessagesSummary: string[];   // 模型输出摘要（每条截断至 1000 字符）
  toolCalls: TrajectoryToolCall[];  // 工具调用记录（名称/参数/成功/观察摘要）
  observations: string[];           // 事件流摘要
  finalAnswer?: string;
  errors: string[];
  durationMs?: number;
  usage?: unknown;                  // DeepSeek token usage
  result?: AgentResult;
  success?: boolean;                // stoppedReason === "final"
  humanFeedback?: unknown;          // 预留字段
};
```

**关键设计**：
- `modelMessagesSummary` 截断至 1000 字符/条 — 完整的 model output 太大
- `observations` 只保留摘要行 — 不是完整的 stdout 日志
- `humanFeedback` 是预留字段 — 方便后续标注流程写入
- `success` = `result.stoppedReason === "final"` — 简单的成功判定（可用于 reward signal）

### TrajectoryRecorder 的工作原理

在 `runAgentLoop` 中，`TrajectoryRecorder` 在 loop 创建时就启动：

```typescript
const trajectory = new TrajectoryRecorder(deps.config, runId, input);
```

然后对每个 `AgentEvent` 调用 `trajectory.observe(event)`，自动累积：
- `tool_call_start` → 追加到 `toolCalls` 列表
- `tool_call_end` → 更新对应 toolCall 的 ok/observationSummary
- `assistant_message` → 追加到 `modelMessagesSummary`
- `error` → 追加到 `errors`
- `done` → 调用 `finish(result)`，设置 endedAt/durationMs/success

最后在 `done` 事件中写入文件：
```typescript
if (event.type === "done") {
  trace.write({ type: "trajectory_written", path: trajectory.write() });
}
```

所有内容在写入前经过 `redactValue()` 脱敏（`security/secrets.ts`）。

### Trace vs Trajectory

| | Trace (jsonl) | Trajectory (json) |
|---|---|---|
| 粒度 | 逐事件 | 聚合 |
| 大小 | 大（完整事件流） | 小（摘要 + 结构化） |
| 用途 | Debug、回放 | RL 训练、评估、分析 |
| 格式 | 一行一个 JSON 事件 | 单个 JSON 对象 |

## 操作指南

### 查看轨迹

```bash
npm run dev
# 进行一次对话后

# 列出轨迹文件
ls data/trajectories/

# 查看最新轨迹
cat data/trajectories/<runId>.json | python3 -m json.tool
```

### 理解轨迹中的字段

```json
{
  "runId": "a1b2c3d4-...",
  "startedAt": "2026-05-08T12:00:00.000Z",
  "endedAt": "2026-05-08T12:00:15.234Z",
  "userInput": "列出当前目录的文件",
  "modelMessagesSummary": [
    "assistant: 我来列出当前目录的文件。",
    "assistant: 当前目录包含以下文件：..."
  ],
  "toolCalls": [
    {
      "id": "call_xxx",
      "name": "list_dir",
      "arguments": "{\"path\":\".\"}",
      "ok": true,
      "observationSummary": "{...tool result...}"
    }
  ],
  "observations": [
    "assistant: 我来列出当前目录的文件。",
    "stdout: ...",
    "assistant: 当前目录包含以下文件：..."
  ],
  "finalAnswer": "当前目录包含以下文件：...",
  "errors": [],
  "durationMs": 15234,
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 120,
    "total_tokens": 570
  },
  "result": {
    "runId": "a1b2c3d4-...",
    "finalText": "当前目录包含以下文件：...",
    "steps": 1,
    "stoppedReason": "final"
  },
  "success": true
}
```

### 为 RL 准备数据

如果你将来要做 Agentic RL，你需要的数据格式已经就绪：

```bash
# 提取所有成功轨迹的 userInput 和 finalAnswer 对
for f in data/trajectories/*.json; do
  python3 -c "
import json
t = json.load(open('$f'))
if t.get('success'):
    print(json.dumps({
        'input': t['userInput'],
        'output': t['finalAnswer'],
        'tool_calls': len(t['toolCalls']),
        'duration_ms': t['durationMs']
    }))
"
done
```

## 超越原教程

| hello-agents 第十一章 | 本 harness |
|---|---|
| RL 概念讲解 | 工程化的 trajectory 导出，可直接用于训练 pipeline |
| 无实际数据格式 | 明确的 AgentTrajectory schema |
| 无脱敏 | 轨迹写入前自动 redact API key 等敏感信息 |
| 无成功判定 | `success` 字段自动计算（stoppedReason === "final"） |
| 无 human feedback 字段 | 预留 `humanFeedback` 字段方便标注 |

## 关键文件

| 文件 | 作用 |
|---|---|
| `src/trajectories/trajectory.ts` | AgentTrajectory 类型 + summarizeEvent |
| `src/trajectories/exporter.ts` | TrajectoryRecorder — 收集/写入轨迹 |
| `src/runtime/trace.ts` | TraceWriter — 逐事件 jsonl |
| `src/runtime/events.ts` | AgentEvent / AgentResult — 事件类型 |
| `src/security/secrets.ts` | redactValue — 轨迹脱敏 |
