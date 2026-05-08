# Streaming

The harness has two streaming layers.

## DeepSeek Streaming

src/deepseek/client.ts calls DeepSeek chat completions with stream=true. src/deepseek/stream.ts parses SSE chunks into ModelStreamEvent:

- content_delta
- reasoning_delta
- tool_call_delta
- choice_done
- done

src/runtime/loop.ts converts these into AgentEvent values such as llm_delta, llm_reasoning_delta, assistant_message, and tool_call_start.

## Terminal Streaming

src/terminal/stream.ts runs bash -lc through Node spawn and yields stdout, stderr, error, and exit events. The CLI displays stdout/stderr live. The model receives a bounded structured observation, not unlimited terminal logs.

HARNESS_MAX_TOOL_OUTPUT_CHARS controls the captured observation length returned to the model. Live terminal display is not truncated by that setting.

## Trace and Trajectory

Trace jsonl files are written to data/traces. Trajectory json files are written to data/trajectories. Both apply basic redaction and should still be treated as sensitive local logs.

