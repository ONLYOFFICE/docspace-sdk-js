# AGENTS.md

Instructions for coding agents (Claude Code, Codex, Copilot, Cursor, Gemini CLI, Jules, Amp) working in this repository. `CLAUDE.md` imports this file. Human-oriented setup and release notes live in `CONTRIBUTING.md`; the full documentation style guide is `docs-generation.md`.

## Project

ONLYOFFICE Apps Embed SDK (`@onlyoffice/docspace-sdk-js`) — TypeScript library that embeds ONLYOFFICE Apps UI (file manager, document editor and viewer, room and file selectors, uploader, forms gallery, AI chat, personal files) into web applications via an iframe with postMessage communication.

The SDK is transport only: it builds the iframe URL from a config, posts method calls into the frame and resolves their replies. The behaviour behind every method and event lives in the ONLYOFFICE Apps client, not here.

## Commands

```bash
pnpm install                        # Install dependencies (pnpm 12, pinned in package.json → packageManager)
pnpm lint                           # ESLint on src/ (naming rules are enforced here)
pnpm typecheck                      # tsc --noEmit
pnpm test                           # vitest, jsdom
npx vitest run tests/utils.test.ts  # One test file
pnpm build                          # esbuild → dist/ (esm, cjs, iife api.js, .d.ts)
pnpm run docs                       # TypeDoc + tools/docs post-processing → docs/; strict, any warning fails
pnpm check-links                    # External links in README.md and CONTRIBUTING.md
pnpm audit                          # Expected to report no known vulnerabilities
```

## Definition of done

A change is done when all of the following hold. CI (`.github/workflows/ci.yml`) runs the same checks on every push and pull request.

1. `pnpm lint`, `pnpm typecheck` and `pnpm test` are green, and new behaviour has a test in `tests/`.
2. `pnpm run docs` completes with zero TypeDoc warnings and zero `[warn]` lines. `docs/` is gitignored and regenerated on every run: fix the JSDoc or a `tools/` script, never the output.
3. Every public symbol touched has JSDoc that follows the conventions below, and `pnpm build` succeeds.
4. `CHANGELOG.md` has an entry under the current version (the first `## x.y.z` heading; the release tag is derived from it).
5. For a new config field, instance method or mode, the matching checklist in `.claude/skills/` was followed to its Definition of Done.

## Tooling

pnpm 12, pinned in `package.json` → `packageManager` (pnpm 11+ switches automatically; pnpm 10 fails with ENOEXEC, upgrade it globally). pnpm settings live in `pnpm-workspace.yaml` (`allowBuilds`; overrides would go there too); the `pnpm` field in package.json is not read. Node.js 24.15+ (jsdom 30). TypeScript stays on 6.x: TypeScript 7 is the native compiler without the JS API used by `tools/build.mjs`, and typedoc / typescript-eslint peers cap at 6.0.x. `typedoc-plugin-markdown`, `typedoc-docusaurus-theme` and `typedoc-plugin-frontmatter` move together and can change the generated Markdown (signature layout, unions in tables); bump them only with a before/after `docs/` diff reviewed by the site team, the reference is consumed by another team.

CI: `ci.yml` runs lint, typecheck, tests, build, docs generation, the link check, a `pnpm pack` package-contents check and `pnpm audit` on pushes to develop and master, on pull requests and on demand. `release.yml` publishes only on a `v*` tag, which `create-tag.yml` creates on a push to master from the CHANGELOG version.

## Architecture

**SDK** (`src/sdk/`) — factory and registry of instances. `frames: Record<string, SDKInstance>`. Every `init*` method (initManager, initEditor, initViewer, initRoomSelector, initFileSelector, initSystem, initPublicRoom, initUploader, initForms, initChat, initPersonal) is a thin wrapper over `init()` that forces `mode`. Reuses the existing instance if `frameId` matches.

**SDKInstance** (`src/instance/`) — manages one iframe. Creates DOM elements, handles the postMessage protocol with a callback queue (`#callbacks`/`#tasks`), exposes public methods that proxy calls into the iframe (getFiles, getUserInfo, login, createRoom, setConfig, navigateSection, upload, etc.). Config merge order: `defaultConfig` → stored config → user config. Each callback stores `{resolve, reject, timer}`; methods have a configurable timeout (`methodTimeout`, default 30 s). Cached iframe reference in `#iframe`.

**postMessage protocol** — all messages flow iframe → host. Five types in `MessageTypes`: `onMethodReturn` (resolves a promise), `onEventReturn` (fires an event handler), `onCallCommand` (iframe asks the host to call a method), `error` (fires onAppError), `uploadFileData` (host → iframe binary transfer for uploads).

| Module | Contains | Key exports |
|---|---|---|
| `src/types/` | All public types | `TFrameConfig`, `TFrameEvents`, `TFrameFilter`, `TEditorCustomization` |
| `src/enums/` | Public + internal enums | `SDKMode`, `Theme`, `EditorType`, `FilterSortBy`, `InstanceMethods`\* |
| `src/constants/` | Default config, constants | `defaultConfig`, `FRAME_NAME`, `CSPApiUrl` |
| `src/errors/` | Error class and codes | `SDKError`, `SDKErrorCode` |
| `src/utils/` | Pure functions | `validateCSP`, `getFramePath`, `getLoaderStyle`, `getConfigFromParams` |

\* `InstanceMethods`, `MessageTypes` are `@internal` — not in generated docs.

### Entry points

- `src/main.ts` — Node/bundler entry. Exports SDK, sets `window.DocSpace`. Builds to CJS + ESM.
- `src/main.browser.ts` — IIFE entry (`dist/api.js`). Additionally parses config from `<script>` tag query params and auto-initializes if `config.init` is set.

### Docs pipeline (`tools/`)

`typedoc.config.mjs` → TypeDoc → `tools/docs/index.mjs` (page transforms, `<APITable>` wrapping, section `index.md` pages) → `tools/update-sidebar.mjs`. Section prose and sidebar labels live in `tools/docs/sections.mjs`. TypeDoc warnings fail the run (`treatValidationWarningsAsErrors`), and `index.mjs --strict` fails on `[warn]` lines. Transforms are covered by `tests/docs-tools.test.ts`. Full guide: `docs-generation.md`.

## Conventions

**Product name.** The product is ONLYOFFICE Apps; prose, JSDoc and examples say so, and example hosts are `portal.example.com`. The DocSpace name survives only where something outside this repo reads it, and those spellings must not be "fixed": the package name `@onlyoffice/docspace-sdk-js`, the `window.DocSpace.SDK` global that script-tag integrations call, the `frameDocSpace` iframe name prefix the portal client matches, the `github.com/ONLYOFFICE/docspace-*` URLs, the `docspace/javascript-sdk/usage-sdk` docs-site path and the `/static/scripts/sdk/` script URL.

**Naming (enforced by ESLint):**
- Type aliases: `T` + PascalCase (`TFrameConfig`, `TFrameEvents`)
- Enums and enum members: PascalCase (`SDKMode.Manager`)
- Imports: inline type format (`import { type Foo } from "..."`)

**Code style:**
- Max line length 120, max complexity 35
- Private fields use `#` syntax (true private), not the `private` keyword
- All enums except `SDKMode` are `const enum` — values inlined at compile time, not iterable at runtime
- Optional postMessage payload fields use the spread guard `...(x !== undefined && { x })`; a payload never contains `undefined`
- New instance methods reject with `SDKError`; only the legacy `login` and `createRoom` resolve with a `status` field

**JSDoc — required on every public symbol:**
- Cross-reference with `{@link Type.field}`, not plain text
- Inline field comments state the default: `/** Show menu. Default: \`false\`. */`
- Mark internal APIs with `@internal`; they are excluded from generated docs, and a `{@link}` to an `@internal` symbol is a broken link
- Members (fields, enum members, parameters) render as table rows: single paragraph, inline code only, no fenced blocks
- Instance methods carry two `@example` blocks: a simple call, then a composition with another method
- Nested objects in public types get a named `T*` type, never an inline literal

**File header — every source file (`src/`, `tools/`, `tests/`) starts with:**
```typescript
/**
 * (c) Copyright Ascensio System SIA 2026
 * ...Apache 2.0 license text...
 * @license
 */
```
followed in `src/` by a separate `@module` / `@mergeModuleWith <project>` block. Copy both verbatim from any file in `src/`.

## Tests

vitest + jsdom, globals enabled. Files in `tests/`, one suite per area (`sdk`, `instance`, `utils`, `forms`, `chat`, `personal`, `docs-tools`). No real iframe or postMessage: the DOM is simulated and replies are injected as `MessageEvent`s (see `makeConfig` / `setupTarget` in `tests/instance.test.ts`). Method tests cover the posted `TTask`, the resolved reply and the `methodTimeout` rejection with fake timers.

## Do not

- Do not edit `docs/`, `dist/` or `coverage/` by hand; they are generated and gitignored.
- Do not rename or "fix" anything external code reads (see Product name above).
- Do not convert `SDKMode` to `const enum`; the browser entry iterates it at runtime.
- Do not bump the TypeDoc plugins without a `docs/` diff for the site team.
- Do not mention a symbol in plain text where a `{@link}` is possible, and do not link to `@internal` symbols.
- Do not commit, tag or publish unless asked. Releases go develop → master → `v*` tag (see `CONTRIBUTING.md`).

## Where to look

- `.claude/skills/add-config-option`, `add-instance-method`, `add-sdk-mode`, `docs-style`: step-by-step checklists for the recurring change types. Any agent can read the `SKILL.md` files directly.
- `docs-generation.md`: full documentation style guide and pipeline reference, including gotchas.
- `CONTRIBUTING.md`: toolchain, branches, releases, who publishes the reference.
- `ONLYOFFICE/agent-skills` repository: the public `embed-sdk` skill that teaches integrators' agents to use this SDK. Its `sync-sdk.mjs --check` compares the skill's validator with the SDK's type declarations; a public API change here is followed by an update there.
- `tests/instance.test.ts`: idioms for simulating the postMessage protocol.
