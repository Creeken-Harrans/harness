# Tool Protocol

Tools implement src/tools/tool.ts.

Required fields:

- name
- description
- inputSchema
- risk
- timeoutMs optional
- run(input, ctx)

ToolResult contains ok, content, optional data, error, metadata, and truncated. Streaming tools can yield ToolEvent stdout, stderr, progress, result, or error.

## Registry

ToolRegistry registers tools, validates names, lists tools, and exports DeepSeek/OpenAI-compatible tool definitions. Runtime code uses ToolRunner.registry.exportDeepSeekTools rather than importing a static tool array.

## Runner

ToolRunner:

1. Parses model tool-call JSON arguments.
2. Checks the tool exists in ToolRegistry.
3. Performs lightweight JSON schema validation.
4. Applies the permission policy.
5. Executes the tool.
6. Converts streaming ToolEvent to AgentEvent.
7. Serializes a redacted, bounded ToolResult as the tool message returned to DeepSeek.

## Risk Policy

- safe: no approval.
- read: no approval.
- write: approval unless approval mode is never.
- shell: approval unless approval mode is never.
- network: approval unless approval mode is never.
- dangerous: denied unless explicitly enabled, then approval-gated.

The user may see full streamed output, but the model receives a structured observation so context does not become unbounded noisy logs.

