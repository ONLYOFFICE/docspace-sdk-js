# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ONLYOFFICE DocSpace JavaScript SDK (`@onlyoffice/docspace-sdk-js`) — TypeScript library that embeds DocSpace UI into web applications via iframes with postMessage communication.

## Commands

```bash
pnpm install                        # Install dependencies
pnpm build                          # Build all bundles (esbuild → dist/)
pnpm test                           # Run all tests (vitest, jsdom)
pnpm lint                           # ESLint on src/
pnpm run docs                       # Regenerate TypeDoc → docs/
npx vitest run tests/utils.test.ts  # Run single test file
```

## Architecture

**SDK** (`src/sdk/`) — factory and registry of instances. `frames: Record<string, SDKInstance>`. Every `init*` method (initManager, initEditor, initViewer, initRoomSelector, initFileSelector, initSystem, initPublicRoom, initUploader, initForms, initChat) is a thin wrapper over `init()` that forces `mode`. Reuses existing instance if `frameId` matches.

**SDKInstance** (`src/instance/`) — manages one iframe. Creates DOM elements, handles postMessage protocol with callback queue (`#callbacks`/`#tasks`), exposes public methods that proxy calls into the iframe (getFiles, getUserInfo, login, createRoom, setConfig, navigateSection, upload, etc.). Config merge order: `defaultConfig` → stored config → user config. Each callback stores `{resolve, reject, timer}` — methods have a configurable timeout (`methodTimeout`, default 30 s). Cached iframe reference in `#iframe`.

**postMessage protocol** — all messages flow iframe → host. Five types in `MessageTypes`: `onMethodReturn` (resolves promise), `onEventReturn` (fires event handler), `onCallCommand` (iframe asks host to call a method), `error` (fires onAppError), `uploadFileData` (host → iframe binary transfer for file uploads).

### Key modules

| Module | Contains | Key exports |
|---|---|---|
| `src/types/` | All public types | `TFrameConfig`, `TFrameEvents`, `TFrameFilter`, `TEditorCustomization` |
| `src/enums/` | Public + internal enums | `SDKMode`, `Theme`, `EditorType`, `FilterSortBy`, `InstanceMethods`\* |
| `src/constants/` | Default config, constants | `defaultConfig`, `FRAME_NAME`, `CSPApiUrl` |
| `src/utils/` | Pure functions | `validateCSP`, `getFramePath`, `getLoaderStyle`, `getConfigFromParams` |

\* `InstanceMethods`, `MessageTypes` are `@internal` — not in generated docs.

### Entry points

- `src/main.ts` — Node/bundler entry. Exports SDK, sets `window.DocSpace`. Builds to CJS + ESM.
- `src/main.browser.ts` — IIFE entry (`dist/api.js`). Additionally parses config from `<script>` tag query params and auto-initializes if `config.init` is set.

## Conventions

**Naming (enforced by ESLint):**
- Type aliases: `T` + PascalCase (`TFrameConfig`, `TFrameEvents`)
- Enums and enum members: PascalCase (`SDKMode.Manager`)
- Imports: inline type format (`import { type Foo } from "..."`)

**Code style:**
- Max line length: 120, max complexity: 35
- Private fields use `#` syntax (true private), not `private` keyword
- All enums except `SDKMode` are `const enum` — values inlined at compile, not iterable at runtime

**JSDoc — required on every public symbol:**
- Cross-reference with `{@link Type.field}`, not plain text
- Inline field comments with default values: `/** Show menu. Default: \`false\`. */`
- Mark internal APIs with `@internal` — they are excluded from generated docs
- See `docs-generation.md` for full style guide with examples

**File header — every source file must start with:**
```typescript
/**
 * (c) Copyright Ascensio System SIA 2026
 * ...Apache 2.0 license text...
 * @license
 */

/**
 * @module
 * @mergeModuleWith <project>
 */
```

**Tests:** vitest + jsdom, globals enabled. Files in `tests/`. No real iframe/postMessage in tests — DOM is simulated.
