# Roadmap

## Implemented in This Phase

- Tool protocol foundation.
- Workspace, file, git, and patch tools.
- Context engineering modules.
- Memory interfaces, notes, todos, and trajectory export.
- Agent family modes.
- MCP and A2A extension-point skeletons.
- Minimal eval harness.

## Honest TODOs

- Real SQLite memory store and migration tool.
- Vector memory/RAG ingestion, likely through python/rag first.
- Strong sandbox backend for shell and write tools.
- Diff preview approval for file and patch tools.
- MCP JSON-RPC session management and resource adapters.
- Remote A2A protocol transport, auth, streaming, and cancellation.
- Deeper Plan-Execute implementation with explicit plan state machine.
- Reflection agent with a real bounded correction loop.
- Eval runner that can safely run full model-agent cases without requiring live API in CI.
- Agentic RL trajectory cleaning and preference feedback export.

## Python and Rust

Python remains auxiliary for embeddings, RAG ingestion, eval analysis, trajectory cleaning, and training export. Rust remains auxiliary for PTY, sandbox, fast file scanning, and process-tree control.

