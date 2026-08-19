---
name: add-sdk-mode
description: >
  Add a new SDKMode (embedded UI surface) to the DocSpace SDK. Use when wiring a
  new frame mode end to end: enum, init wrapper, frame path, config fields, tests.
---

# Add an SDK mode

A mode is a distinct embedded UI surface (manager, editor, forms, chat, …). Wiring
one touches every layer of the SDK. Recent reference implementations: Forms, Chat,
Personal (commits on `develop`) — mirror their shape.

## 1. Enum — `src/enums/index.ts` → `SDKMode`

- `SDKMode` is the **only non-const enum** — it must stay iterable at runtime.
  Do not convert it to `const enum`.
- Value = kebab-case string used in URLs and script-tag params (`"public-room"`).
- JSDoc: what the mode renders, required config fields, forced settings
  (e.g. `Forces noLoader: false.`), links via `{@link TFrameConfig.x}`.

## 2. Init wrapper — `src/sdk/index.ts`

Property-style wrapper forcing the mode, modeled on `initForms` / `initPersonal`:

```typescript
initX = (config: TFrameConfig) =>
  this.init({ ...config, mode: SDKMode.X });
```

With full JSDoc + `@example`.

## 3. Frame path — `src/utils/index.ts` → `getFramePath`

- Add a `case SDKMode.X` branch: base path + query via `buildPath` /
  `customUrlSearchParams`. Reuse `baseFrameOptions` (theme/locale/stylesUrl/auth).
- If the branch pushes `getFramePath` over the complexity budget (max 35), extract a
  helper like `getPersonalPath` / `getChatPath`.
- Update the JSDoc table "Mode | Base path | Key parameters" above `getFramePath`.

## 4. Types — `src/types/index.ts`

- New mode-specific `TFrameConfig` fields, each JSDoc-linked to `{@link SDKMode.X}`
  with `` Default: `value`. `` (see the add-config-option skill — steps 1–4 there
  apply to every new field, including `getConfigFromParams`).
- If the mode has navigable sections — a section type modeled on `TFormsSection` /
  `TPersonalSection`.
- New events go into `TFrameEvents`.

## 5. Defaults — `src/constants/index.ts`

Defaults for the new fields in `defaultConfig`; new event handlers in
`defaultConfig.events` as `null`.

## 6. Instance logic — `src/instance/index.ts`

Only if the mode needs special init/guard behavior: forced loader, `headerOffset` /
`headerHeight` handling, mode-guarded methods (`navigateSection` pattern —
`SDKError(SDKErrorCode.ModeMismatch, ...)`).

## 7. Tests — new file `tests/<mode>.test.ts`

Follow the structure of `forms.test.ts`:

- init through the wrapper forces `mode`;
- `getFramePath` produces the correct base path and query for the new fields;
- mode-specific fields and defaults;
- events fire on simulated `onEventReturn` messages.

jsdom only — no real iframe/postMessage.

## 8. Knowledge sync

- Update the mode list in `CLAUDE.md` (SDK section: `init*` enumeration).
- After merge: update the public `docspace-sdk` skill in `docspace-agent-skills`
  (routing table in SKILL.md + new `references/modes/<mode>.md` +
  `validate-config.mjs` mode list), and `@onlyoffice/docspace-react` if the wrapper
  should expose the mode. Record the minimum portal version that serves the new
  frame path — older portals will show an empty frame or `TIMEOUT`.

## 9. Docs

`pnpm run docs`. Every new source file starts with the standard header: copyright
Ascensio System SIA + Apache 2.0 + `@license`, then `@module` /
`@mergeModuleWith <project>`.

## Verify

```bash
pnpm lint
npx vitest run tests/<mode>.test.ts
pnpm test
pnpm run docs
```

## Definition of Done

- [ ] Lint and full test suite green, including the new test file.
- [ ] `getFramePath` returns the correct path + query; JSDoc mode table updated.
- [ ] Wrapper forces `mode`; `SDKMode` still a regular (iterable) enum.
- [ ] New fields wired through types → defaults → parser (per add-config-option).
- [ ] CLAUDE.md mode list updated.
- [ ] `pnpm run docs` regenerated without warnings.
- [ ] Post-merge sync tasks filed (public skill, react wrapper, portal version).
