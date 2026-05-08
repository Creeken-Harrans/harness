# Streaming

Phase 1 引入两类 streaming：DeepSeek model streaming 和 terminal stdout/stderr streaming。

## LLM Streaming

`DeepSeekClient.chatStream(messages, tools)` 返回 `AsyncGenerator<ModelStreamEvent>`。

事件来源是 DeepSeek/OpenAI-compatible SSE：

- `content_delta`：普通 assistant 文本。
- `reasoning_delta`：DeepSeek `reasoning_content`，仅在模型返回时出现。
- `tool_call_delta`：工具调用增量，runtime 会累积成完整 tool call。
- `choice_done` / `done`：stream 结束信息与 usage。

Runtime 把这些事件转换成 `AgentEvent`：

- `llm_delta`
- `llm_reasoning_delta`
- `assistant_message`

CLI renderer 会实时输出 `llm_delta`。默认 thinking 是 disabled，因此通常不会看到 reasoning stream。

## Terminal Streaming

`Terminal.runStream(command, cwd, timeoutMs)` 返回 `AsyncGenerator<ShellEvent, ShellResult>`。

事件：

- `stdout`
- `stderr`
- `error`
- `exit`

CLI 会实时渲染 stdout/stderr。模型收到的 tool observation 不是无限日志，而是：

```json
{
  "ok": true,
  "result": {
    "command": "npm run build",
    "cwd": "/workspace",
    "exitCode": 0,
    "stdout": "...bounded capture...",
    "stderr": "...bounded capture...",
    "stdoutBytes": 1234,
    "stderrBytes": 0,
    "durationMs": 1200,
    "timedOut": false
  }
}
```

`HARNESS_MAX_TOOL_OUTPUT_CHARS` 控制写回模型的 stdout+stderr 捕获长度。实时 CLI 输出不受这个上限影响。

## Trace

每轮 runtime 会创建：

```text
data/traces/<run-id>.jsonl
```

当前记录：

- model request summary
- model stream completion metadata
- AgentEvent
- tool stdout/stderr
- tool end
- final done / error

Trace 会做基础 secret redaction，不记录 API key 字段。
