@AGENTS.md

# Claude Code

Skills in `.claude/skills/`. Invoke the matching one before starting the task:

- `add-config-option` — adding or changing a `TFrameConfig` field, its default value, or its wiring into the script-tag parser or the iframe URL.
- `add-instance-method` — exposing a new `SDKInstance` method that proxies a call into the iframe.
- `add-sdk-mode` — adding a new `SDKMode` end to end (enum, wrapper, frame path, config, tests).
- `docs-style` — writing or reviewing JSDoc, adding a file header, or fixing a `pnpm run docs` failure.

Before reporting a task as done, run `pnpm lint && pnpm typecheck && pnpm test && pnpm run docs`.
