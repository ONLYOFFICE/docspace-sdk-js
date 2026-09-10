# Documentation Generation Guide

This guide explains how the API reference for `@onlyoffice/docspace-sdk-js` is generated, how the pipeline is structured, and how to write documentation comments so the output stays consistent.

The generated output in `docs/` is published to `api.onlyoffice.com` (section `docspace/javascript-sdk/usage-sdk`). Never edit `docs/` by hand: it is gitignored and wiped on every run (`cleanOutputDir: true`).

## Overview

The documentation system uses:

- **TypeDoc** — extracts documentation from JSDoc comments in the TypeScript sources
- **typedoc-plugin-markdown** — converts TypeDoc output to Markdown
- **typedoc-docusaurus-theme** — emits a Docusaurus-compatible sidebar (`typedoc-sidebar.cjs`); needs **typedoc-plugin-frontmatter**, no frontmatter is emitted
- **`tools/`** — post-processing scripts that reshape the raw TypeDoc output into the final pages

## Generating documentation

Requires Node.js 18 or later and pnpm 10 (`pnpm install` first). Nothing in CI runs this: the reference is generated locally and committed to the site repository.

```bash
pnpm run docs        # full pipeline → docs/
pnpm run docs:sync   # full pipeline + copy into ../api.onlyoffice.com
```

`pnpm run docs` executes four steps in sequence (see `package.json`):

1. **`tools/update-revision.mjs`** — reads the current Git branch and writes it into `typedoc.config.mjs` → `gitRevision`, so "View source on GitHub" links point at the branch being documented.
2. **`typedoc`** — parses the entry points and generates raw Markdown into `docs/`.
3. **`tools/docs/index.mjs`** — rewrites every generated page (see [Post-processing](#post-processing)) and builds an `index.md` per section.
4. **`tools/update-sidebar.mjs`** — prefixes sidebar doc ids with the site path, points each category at its section index, and reverts `gitRevision` back to `master`.

`pnpm run docs:sync` additionally runs `tools/sync-docs.mjs`, which replaces `../api.onlyoffice.com/site/docspace/javascript-sdk/usage-sdk` with the content of `docs/`, dropping the root `index.md`. It is a local copy into the site checkout, not a deploy.

A healthy run produces **no TypeDoc warnings and no `[warn]` lines** from the post-processing scripts. `treatValidationWarningsAsErrors` is on, so a broken `{@link}` target or a referenced type that is not exported fails the run.

## Entry points and output structure

Six entry points, listed in `typedoc.config.mjs`:

```
src/constants/index.ts    # CSPApiUrl, FRAME_NAME, defaultConfig, error messages
src/enums/index.ts        # SDKMode, Theme, EditorType, …
src/errors/index.ts       # SDKError, SDKErrorCode
src/instance/index.ts     # SDKInstance
src/sdk/index.ts          # SDK
src/types/index.ts        # TFrameConfig, TFrameEvents, …
```

Every file carries `@module` + `@mergeModuleWith <project>`, so the output is one flat namespace grouped by kind, one page per symbol:

```
docs/
├── index.md                 # project index (not synced to the site)
├── typedoc-sidebar.cjs      # Docusaurus sidebar
├── classes/                 # SDK.md, SDKInstance.md, SDKError.md + index.md
├── type-aliases/            # TFrameConfig.md, TFrameEvents.md, … + index.md
├── enumerations/            # SDKMode.md, Theme.md, … + index.md
└── variables/               # defaultConfig.md, FRAME_NAME.md, … + index.md
```

## TypeDoc configuration

The full configuration is `typedoc.config.mjs`. The options that define the look of the output:

| Option | Value | Purpose |
|---|---|---|
| `textContentMappings.title.memberPage` | `"{name}"` | Page titles are the bare symbol name (`TFrameConfig`), not `Type Alias: TFrameConfig` |
| `groupOrder` | Classes, Type Aliases, Enumerations, Variables | Order of the kind groups in the sidebar and the project index |
| `sort` | `["alphabetical"]` | Members sorted by name — `TFrameConfig` has 60+ fields, the alphabet is the index |
| `useCodeBlocks` | `true` | Signatures as ` ```ts ` fences instead of blockquotes |
| `expandParameters` | `true` | Inline parameter objects expanded in method signatures |
| `expandObjects` | off | `TFrameConfig` would otherwise open with a 70-line object literal duplicating its table |
| `propertiesFormat` etc. | `"table"` | Members are table rows; TypeDoc's per-row `<a id>` anchors are later replaced by the `<APITable>` wrapper |
| `enumMembersFormat` | `"table"` | Enum members are rows too — member descriptions must stay single-paragraph (see below) |
| `tableColumnSettings` | `{ hideSources: true }` | No per-member source column; one "View source on GitHub" link per page instead |
| `locales.en` | `Deprecated:`, `Remarks:` | Tag headings end with a colon |
| `excludeInternal` / `excludePrivate` / `excludeProtected` | `true` | `@internal` symbols never appear in the output |
| `treatValidationWarningsAsErrors` | `true` | Dead links fail the run instead of reaching the site |
| `sourceLinkTemplate` | GitHub blob URL with `{gitRevision}` | Source links; revision set by `update-revision.mjs`, reverted by `update-sidebar.mjs` |
| `githubPages` | `false` | Keeps TypeDoc from dropping a `.nojekyll` that `docs:sync` would carry into the site repo |

## Post-processing

Layout of `tools/`:

- `shared/markdown.mjs` — shared primitives: `walkMarkdownLines` (line walker that flags code blocks), `transformFile`, `slugify`, `collectPageAnchors`
- `docs/index.mjs` — pipeline order only: page transforms → APITable wrapping → section index pages
- `docs/page-transforms.mjs` — per-page transforms (`PAGE_TRANSFORMS`)
- `docs/api-tables.mjs` — wraps tables in `<APITable>`, swaps the anchor scheme (needs all pages at once)
- `docs/section-index.mjs` — `index.md` per section
- `docs/sections.mjs` — section titles, prose and table headers for the index pages and sidebar categories
- `update-revision.mjs`, `update-sidebar.mjs`, `sync-docs.mjs` — revision, sidebar and sync steps
- `build.mjs` — the package build, unrelated to docs

### Page transforms (in order)

1. `convertSourceLinks` — rewrites `Defined in: [file.ts:N](url)` under the H1 to one `[View source on GitHub](url)` per page; method-level source lines are dropped.
2. `escapePipesInTableCells` — escapes `|` inside inline code in table cells (an unescaped pipe from a comment breaks the row).
3. `fixInPageAnchors` — drops stale `-N` dedup suffixes from in-page hash links; warns about anchors that resolve to nothing.
4. `ensureBlankLineBeforeHeadings` — restores the blank line MDX requires before a heading.

### APITable wrapping

`applyApiTables` (`api-tables.mjs`) runs after the page transforms have validated the original anchors. It wraps every table of a symbol page — member tables (rows carry TypeDoc's `<a id>` anchors) and the parameter tables under method headings — in the docs site's `<APITable>` component via `mdx-code-block` fences, strips the `<a id>` anchors, and rewrites all fragment links — in-page and cross-page — to the ids the component derives at runtime:

- the row id is the **text of the code span in the first cell** (case-sensitive): `<a id="manager">` becomes `#Manager`, `<a id="rootpath">` becomes `#rootPath`;
- TypeDoc's optional marker is moved outside the code span (`` `rootPath`? `` instead of `` `rootPath?` ``), so the id carries no `?` — a `?` in a fragment reads as a query string to Docusaurus' anchor checker;
- on pages where row names collide across tables (a class page, where `roomId` is a parameter of several methods), every table gets a `name="Symbol"` prop and ids become `Symbol-member`: `#createRoom-roomId`, `#SDKInstance-config`;
- the component makes rows clickable and highlights the row targeted by the URL hash.

Hand-written site pages that link to a table row must use the same ids (`TFrameConfig.md#rootPath`, `TFrameEvents.md#onAppReady`). Links to method headings (`SDKInstance.md#login`) are ordinary heading slugs and are unaffected.

### Section index pages

For every section in `tools/docs/sections.mjs` (`classes`, `type-aliases`, `enumerations`, `variables`), `section-index.mjs` generates an `index.md`: an H1, the section description, and an Overview table (`| Class | Description |`, header configurable) built from each page's H1 and the first sentence of its description.

## Sidebar

`update-sidebar.mjs` loads `typedoc-sidebar.cjs`, prefixes every doc id with `docspace/javascript-sdk/usage-sdk`, and gives each kind category a `link` to its section `index.md` (label taken from `sections.mjs`). The site's `sidebars.ts` spreads the result into its "SDK usage" category.

## Writing documentation comments

### File header

Every source file starts with the copyright block ending in `@license` (which makes TypeDoc exclude it from output), followed by a separate `@module` / `@mergeModuleWith <project>` block. Copy both verbatim from any existing file in `src/`.

### Cross-references with `{@link}`

Use `{@link}` for every reference to another symbol — TypeDoc resolves and validates it, and a broken target fails the run:

```typescript
/**
 * The SDK initialization mode. Passed via {@link TFrameConfig.mode}.
 */
export enum SDKMode {
  /** Document editor. Requires {@link TFrameConfig.id}. */
  Editor = "editor",
}
```

Patterns: `{@link TFrameConfig}`, `{@link TFrameConfig.mode}`, `{@link SDKInstance.initFrame}`, `{@link SDKMode.Manager}`, `{@link defaultConfig}`. Never a plain-text mention — it rots silently. A `{@link}` to an `@internal` symbol is a broken link.

### Symbols

- **First sentence matters** — it becomes the page's description in the section Overview table. Make it a complete, self-contained sentence.
- **Examples are fenced ` ```typescript ` blocks** inside `@example`, optionally preceded by a one-line caption. Instance methods get two: a simple call, then a composition with another method referenced via `{@link SDKInstance.other}`.
- **Remarks as admonitions** — write `:::note` … `:::` directly in the comment for a note that should stand out; `@remarks` would render as a heading.
- **`@deprecated`** with the replacement linked: `@deprecated Use {@link SDK.init} instead.`

### Members (table rows)

Fields, enum members and parameters render as **table rows**. Keep their descriptions to a single paragraph with inline code only — no fenced blocks, no lists, no line breaks that must survive (TypeDoc flattens a fenced example into one unreadable run of inline code inside the cell).

Field comments state the default in the exact format:

```typescript
/** Whether to show the side menu. Default: `false`. */
showMenu?: boolean;
```

Enum members whose string value is an API identifier different from the key get a note: `` API value: `"AZ"`. ``

### Nested objects

Give every nested object in a public type a name (`TEditorAnonymous`, `TCustomContextMenuActions`) instead of an inline literal. An inline literal renders as dotted rows (`anonymous.label`) in the parent's table, which the site's `<APITable>` renders as blocks of code; a named type gets its own page and a link from the parent row. `applyApiTables` reports a `[warn]` for every dotted row it finds.

### Internal APIs

Mark anything exported but not public with `@internal` — `InstanceMethods`, `MessageTypes`, `TMessageData`, internal helpers. They are excluded from the output. A type that a public type references must itself be exported and documented (`TEntityBase`, `TListResponse`), otherwise TypeDoc reports it and the run fails.

## Adding a new section

A new kind directory (say TypeDoc starts emitting `functions/`) requires one edit: add a `Section` entry to `tools/docs/sections.mjs` (`docsDir`, `sidebarLabel` matching TypeDoc's category label, title, description, table caption and header). The index page and the sidebar link follow on the next run.

## Gotchas

- `docs/` is regenerated from scratch and gitignored — manual edits are lost; fix the JSDoc or a `tools/` script.
- The `tools/` transforms are regex-based rewrites of TypeDoc's Markdown; a TypeDoc/plugin version bump can silently change the output shape and break them — diff `docs/` against a pre-bump run. `tests/docs-tools.test.ts` covers the transforms on fixtures.
- `update-revision.mjs` mutates `typedoc.config.mjs` and `update-sidebar.mjs` reverts it. An interrupted run can leave `gitRevision` on your branch name — re-run `pnpm run docs` or reset it to `master` before committing.
- `docs:sync` requires the `api.onlyoffice.com` checkout as a sibling directory of the repo.

## Fixing output problems

Fix problems at the source, in this order:

1. the JSDoc comment in `src/`;
2. TypeDoc configuration (`typedoc.config.mjs`);
3. only as a last resort — a new transform in `tools/docs/page-transforms.mjs` (and then a general rule, not a page-specific hack).

A regex transform papering over a comment that could simply be rewritten is technical debt in the pipeline.
