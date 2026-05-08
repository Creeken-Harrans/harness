# Safety Notes

这个项目是学习用 harness，不是生产级安全系统。

## 1. 已做的保护

- 模型请求 shell command 时默认要求用户批准。
- 部分明显危险命令被硬拦截。
- shell stdout/stderr 会实时流给 CLI。
- 写回模型的 shell observation 是结构化 JSON，stdout/stderr 捕获有长度上限。
- 每轮运行写 `data/traces/<run-id>.jsonl`，并对 API key / token / secret 做基础 redaction。
- context manager 不会把旧 tool messages 跨轮乱塞给模型。
- `.env` 被 `.gitignore` 忽略，避免 API key 入库。

## 2. 没有做的保护

- 没有 Docker sandbox。
- 没有文件系统白名单。
- 没有网络访问限制。
- 没有命令级 syscall 隔离。
- 没有权限降级用户。
- 没有完整 prompt-injection 防护。
- 当前 trace redaction 是基础保护，不等价于完整 DLP。

## 3. 建议实践

学习阶段：

```bash
HARNESS_APPROVAL_MODE=shell
HARNESS_WORKSPACE=.
```

不要设置：

```bash
HARNESS_APPROVAL_MODE=never
```

除非你在一次性临时目录或容器里运行。

## 4. 下一步安全增强

推荐添加：

1. Docker backend：所有 shell command 在容器中执行。
2. Path allowlist：文件工具只能访问 workspace。
3. Read-only first policy：模型必须先 inspect，再 modify。
4. Diff approval：写文件前展示 diff。
5. Tool audit log：记录所有 tool calls。
6. Secrets redaction：返回模型前屏蔽 API key、token、私钥。
7. Workspace path policy：文件/Git/Patch 工具默认限制在 workspace 内。
