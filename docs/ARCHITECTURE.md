# Architecture

This harness is a DeepSeek-first TypeScript agent runtime. DeepSeekClient remains the only primary model client. The project uses DeepSeek/OpenAI-compatible messages and tools because DeepSeek supports that schema, not because the runtime is a multi-provider framework.

## Runtime Flow

1. CLI receives user input.
2. AgentRuntime selects an agent mode from HARNESS_AGENT or /agent.
3. ContextBuilder gathers, selects, and structures DeepSeek-compatible messages.
4. DeepSeekClient streams model deltas.
5. Runtime accumulates assistant tool calls.
6. ToolRunner resolves tools through ToolRegistry, checks risk policy, executes, and streams ToolEvent as AgentEvent.
7. Tool observations are serialized back as bounded tool messages.
8. TraceWriter writes data/traces/run-id.jsonl.
9. TrajectoryRecorder writes data/trajectories/run-id.json.

## Main Directories

- src/deepseek: DeepSeek API client and SSE stream parser.
- src/runtime: AgentEvent, loop, trace, runtime wrapper.
- src/tools: Tool interface, registry, runner, permissions, core tools.
- src/workspace: workspace root, path policy, file store, git, patch helpers.
- src/context: gather/select/structure/compress/budget context engineering.
- src/memory: memory interfaces and JSON compatibility wrapper.
- src/notes: long-running task notes, todos, decisions, errors, progress.
- src/agents: simple, react, plan, reflection, coding, research agent modes.
- src/mcp and src/a2a: protocol extension points.
- src/eval: minimal evaluation harness.

## Agent Families

- simple: default tool-calling loop.
- react: ReAct-style action/observation loop over DeepSeek tool calling.
- plan: visible plan, notes/todo recording, then execution.
- reflection: final self-check summary and one correction pass by prompt contract.
- coding: inspect-first local coding workflow with file/git/shell tools.
- research: local-document planner/gather/synthesize workflow.

## Compatibility

Top-level files such as src/runtime.ts, src/deepseek.ts, src/terminal.ts, src/config.ts, and src/commands.ts remain compatibility re-exports. Old src/tools/schema.ts now exports registry-generated DeepSeek tool definitions.

