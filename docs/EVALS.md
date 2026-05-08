# Evaluation Harness

The minimal eval runner lives in src/eval and reads evals/cases/*.json or *.jsonl.

Run:

~~~bash
npm run eval
~~~

## Case Schema

Fields:

- id
- name
- input
- expected optional
- allowedTools optional
- deniedTools optional
- judge
- maxSteps optional
- tags optional
- toolCalls optional local extension for API-free tool evals

## Judges

Implemented rule judges:

- final_contains
- tool_called
- tool_not_called
- permission_denied
- exit_ok
- memory_hit

## Metrics

The report includes success rate, tool call count, denied tool count, duration, and errors.

Current evals are mostly tool-level and do not consume the DeepSeek API by default. Future work can add BFCL-like cases, GAIA-style tasks, and optional DeepSeek-as-judge evaluation.

