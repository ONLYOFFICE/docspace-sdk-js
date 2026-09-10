---
name: add-config-option
description: >
  Add or change a TFrameConfig option in the ONLYOFFICE Apps Embed SDK. Use when adding a new
  frame config field, changing its default value, or wiring it into the browser
  script-tag parser or the iframe URL.
---

# Add a TFrameConfig option

Checklist for adding a config field end to end. Follow the steps **in order** — the
most common failure is touching `types` + `constants` but forgetting the script-tag
parser (`getConfigFromParams`) or the tests.

## 1. Declare the field — `src/types/index.ts`

Add the field to `TFrameConfig`:

- JSDoc is mandatory: purpose, applicable modes via `{@link SDKMode.X}`, and the
  default in the exact format `` Default: `value`. `` The field renders as a table
  row: one paragraph, inline code only, no fenced blocks (see the docs-style skill).
- Naming: camelCase. The field must be optional (`?`) — only `frameId`, `mode`, and
  `src` are required.
- If the field is an event handler, add it to `TFrameEvents` instead, typed
  `((...)=> void) | null`.

## 2. Default value — `src/constants/index.ts`

If the field has a default, add it to `defaultConfig`. Event handlers are also added
to `defaultConfig.events` with value `null`.

Skip this step only for fields with no meaningful default (they stay `undefined`).

## 3. Script-tag parser — `src/utils/index.ts` → `getConfigFromParams`

This is the browser entry (`dist/api.js` loaded via `<script>` tag). Rules:

- All query params arrive as **strings**. Only `"true"`/`"false"` are auto-converted
  to booleans. A numeric or structured field needs **explicit parsing added here** —
  otherwise script-tag users silently get a string.
- Keys that literally match fields of `defaultConfig.filter` (`count`, `page`,
  `sortBy`, `sortOrder`, `search`, `withSubfolders`) are routed into `config.filter`
  automatically. **Check for name collisions** when choosing the field name — a
  top-level field named like a filter field will land in the wrong place.

## 4. Iframe URL — `src/utils/index.ts` → `getFramePath`

Only if the field must reach ONLYOFFICE Apps via the iframe URL:

- Add it to the query of every applicable mode branch (`switch (config.mode)`).
  Shared options go into `baseFrameOptions` / `baseSelectorOptions` /
  `baseEditorOptions`; mode-specific ones into that mode's `buildPath` call
  (Personal and Chat have extracted helpers `getPersonalPath` / `getChatPath`).
- `customUrlSearchParams` drops `null`/`undefined` — pass `config.x || undefined`
  for "omit when empty" semantics.
- Update the JSDoc table above `getFramePath` ("Mode | Base path | Key parameters").

## 5. Instance behavior — `src/instance/index.ts`

Only if the field changes runtime behavior of the instance: look at
`#prepareFrameConfig`, `#createContainer`, `#setupIframe`.

## 6. Tests

- `tests/utils.test.ts` — param parsing in `getConfigFromParams` and presence in
  the `getFramePath` output for each applicable mode.
- Mode-specific behavior — in the matching suite (`forms.test.ts`,
  `personal.test.ts`, `instance.test.ts`). DOM is simulated by jsdom; no real
  iframe/postMessage.
- For fields reachable via script-tag, the test must pin the **exact query-param
  syntax**. Known trap: real integrations used legacy bracket forms like
  `filter[count]` / `filter[sortorder]` (lowercase), which the current parser does
  **not** recognize — do not introduce new syntax divergences.

## 7. Docs

Run `pnpm run docs` and check the field appears in the generated reference
(`@internal` symbols are excluded). Never edit `docs/` by hand.

If you created any new source file, it must start with the standard header:
copyright Ascensio System SIA + Apache 2.0 + `@license`, then the
`@module` / `@mergeModuleWith <project>` block (copy from any file in `src/`).

## Verify

```bash
pnpm lint
pnpm test            # or: npx vitest run tests/utils.test.ts
pnpm run docs
```

## Definition of Done

- [ ] `pnpm lint` and `pnpm test` are green.
- [ ] Field exists in `TFrameConfig` **and** `defaultConfig` (when it has a default).
- [ ] `getConfigFromParams` handles it correctly (type conversion, no filter-key
      collision) — or the field is explicitly not script-tag-reachable.
- [ ] `getFramePath` includes it for every applicable mode, JSDoc table updated.
- [ ] JSDoc states the default (`` Default: `value`. ``) and applicable modes.
- [ ] Tests cover the new path (parser + frame path + mode behavior if any).
- [ ] `pnpm run docs` regenerated without warnings (warnings fail the run).
- [ ] After merge: assess impact on `@onlyoffice/docspace-react` (bundles its own SDK
      copy), the public `embed-sdk` skill (`agent-skills` repo:
      routing table, `config-reference.md`, `validate-config.mjs` dictionary), and
      note the minimum portal version for the new capability (`api.js` is pinned by
      path `/static/scripts/sdk/{version}/api.js`).
