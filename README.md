# DeepSeek TypeScript Agent Harness

DeepSeek-first, TypeScript-first local agent harness for experimenting with AI Native Agent runtime ideas. The project keeps DeepSeek as the primary model client and uses DeepSeek/OpenAI-compatible message and tool schemas only because DeepSeek supports that protocol shape.

This is not a generic multi-provider framework and it is not a production sandbox.

## Implemented Capabilities

- DeepSeek streaming chat completions with content, reasoning_content, and tool-call deltas.
- Event-driven runtime using AsyncGenerator and AgentEvent.
- Terminal streaming with live stdout/stderr and bounded model observations.
- ToolRegistry, ToolRunner, risk levels, approval policy, and structured ToolResult.
- Workspace-safe file, git, patch, shell, memory, session, and notes tools.
- ContextBuilder with gather, select, structure, compress, and budget reporting.
- JSON memory store with keyword and Chinese bigram search compatibility.
- Notes and todo files under data/notes.
- Trace jsonl under data/traces and trajectory json under data/trajectories.
- Agent families: simple, react, plan, reflection, coding, research.
- MCP and A2A extension-point skeletons.
- Minimal eval harness with tool-level regression cases.

## Quick Start

~~~bash
npm install
cp .env.example .env
npm run dev
~~~

Build and run:

~~~bash
npm run build
npm start
~~~

Run the minimal eval suite:

~~~bash
npm run eval
~~~

## Environment

Key variables:

- DEEPSEEK_API_KEY
- DEEPSEEK_BASE_URL
- DEEPSEEK_MODEL
- DEEPSEEK_THINKING
- DEEPSEEK_REASONING_EFFORT
- HARNESS_WORKSPACE
- HARNESS_DATA_DIR
- HARNESS_APPROVAL_MODE
- HARNESS_MAX_STEPS
- HARNESS_CONTEXT_BUDGET
- HARNESS_AGENT

HARNESS_APPROVAL_MODE defaults to shell. Shell, write, network, and dangerous risk tools are approval-gated unless approval mode is never. Dangerous tools are still denied unless HARNESS_ALLOW_DANGEROUS_TOOLS=true.

## Slash Commands

- /help
- /exit
- /clear
- /remember text
- /mem query
- /context
- /model
- /think off|high|max
- /pwd
- /sh command
- /trace
- /tools
- /notes file
- /todo
- /agent name
- /workspace
- /git
- /diff

## Safety Boundary

File, git, and patch tools are constrained to HARNESS_WORKSPACE by path policy. Protected paths such as .env, SSH keys, and credential-like filenames are denied by default. Shell commands still run on the host through bash, so this is not a production-grade sandbox.

## Current Limits

- SQLite/vector memory is an interface and TODO, not active runtime storage.
- MCP/A2A are extension points, not full protocol implementations.
- Research agent is local-document research only; no web search tool is registered.
- Reflection and Plan-Execute are implemented as agent modes over the core DeepSeek loop, with concise visible summaries rather than exposed private reasoning.

See docs/ROADMAP.md for the next engineering steps.

