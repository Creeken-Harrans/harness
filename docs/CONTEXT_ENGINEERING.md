# Context Engineering

ContextBuilder is the compatibility-safe entry point for model input construction.

## Gather

src/context/gather.ts collects:

- base system instructions
- SOUL.md
- AGENTS.md files from workspace ancestors
- relevant memory
- recent session messages
- workspace index summary

## Select

src/context/select.ts chooses sources under HARNESS_CONTEXT_BUDGET. High-priority system, SOUL, and AGENTS instructions are mandatory. Other sources can be dropped with reasons.

## Structure

src/context/structure.ts converts selected sources into DeepSeek-compatible messages. Context blocks are kept as system messages, while recent transcript messages remain user/assistant messages.

## Compress

src/context/compress.ts provides rule-based truncation for long text and observations. A future DeepSeek summarizer can replace these rules.

## Inspect

/context shows the last context report: budget, selected sources, dropped sources, recent session count, memory hits, and workspace index status.

More context is not always better. The builder keeps high-priority constraints and recent relevant material while dropping lower-value sources once the budget is full.

