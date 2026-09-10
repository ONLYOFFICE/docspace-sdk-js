---
name: docs-style
description: >
  JSDoc and TypeDoc conventions for the DocSpace SDK. Use when writing or
  reviewing JSDoc on public symbols, adding file headers, or regenerating docs.
---

# DocSpace SDK documentation style

Condensed, enforceable mirror of `docs-generation.md` (the full style guide with
examples — read it for anything not covered here). The generated output in `docs/`
is published to `api.onlyoffice.com` — never edit `docs/` by hand.

## Rules

1. **JSDoc on every public symbol** — classes, methods, types, type fields, enums,
   enum members, exported constants. No exceptions.

2. **Cross-references only via `{@link}`** — `{@link TFrameConfig.frameId}`,
   `{@link SDKMode.Manager}`, `{@link SDKInstance.createHash}` — never plain-text
   mentions like "see TFrameConfig". TypeDoc turns links into navigation; plain text
   rots silently.

3. **Field comments state the default** in the exact format:
   ```typescript
   /** Whether to show the side menu. Default: `false`. */
   showMenu?: boolean;
   ```

4. **`@internal` on everything non-public** — `InstanceMethods`, `MessageTypes`,
   internal helpers (`customUrlSearchParams`, `validateCSP`, `getFramePath`, …),
   internal types. TypeDoc excludes them from the generated reference. If a symbol
   must be exported but shouldn't be documented — it's `@internal`.

5. **File header on every source file**, in this order:
   - copyright Ascensio System SIA + Apache 2.0 license text + `@license` tag;
   - then a separate block: `@module` / `@mergeModuleWith <project>`.
   Copy verbatim from any existing file in `src/`.

6. **Examples in fenced ```typescript blocks.** Instance methods get **two**
   `@example` blocks: a simple call, then a composition with another method
   referenced via `{@link SDKInstance.other}` (see `login` / `logout`).

7. **Naming (ESLint-enforced):** type aliases `T` + PascalCase (`TFrameConfig`);
   enums and members PascalCase (`SDKMode.Manager`); type imports inline
   (`import { type Foo } from "..."`). Enum members whose string value is an API
   identifier different from the key get a JSDoc note: `` API value: `"AZ"`. ``

8. **Members are table rows.** Fields, enum members and parameters render as
   rows of a table wrapped in the site's `<APITable>`: keep their descriptions to
   one paragraph with inline code only — no fenced blocks, no lists. Symbol-level
   comments (the block above a type, class, enum or method) may carry `@example`
   fences and `:::note` admonitions; use `:::note` instead of `@remarks`, which
   renders as a heading. Nested objects get a named `T*` type, never an inline
   literal — inline literals become dotted rows (`anonymous.label`) that the
   site renders as code blocks; the pipeline warns about them.

9. **Regeneration:** `pnpm run docs` (runs update-revision → typedoc →
   tools/docs/index.mjs → update-sidebar). Run it whenever public JSDoc changed.
   TypeDoc warnings fail the run (`treatValidationWarningsAsErrors`): a warning
   means a broken `{@link}` target or a referenced type that is not exported.
   Post-processing `[warn]` lines (unresolved in-page anchor, duplicate APITable
   row id) must be zero too. Site-facing links to table rows use the APITable
   ids: the first-cell code span, case-sensitive, without the optional `?`
   (`TFrameConfig.md#rootPath`); on class pages parameters are prefixed by
   method (`SDKInstance.md#createRoom-roomId`).

## Verify

```bash
pnpm lint                              # naming rules are ESLint-enforced
pnpm run docs                          # must complete with zero warnings and zero [warn] lines
npx vitest run tests/docs-tools.test.ts  # when a tools/ script changed
```

## Definition of Done

- [ ] `pnpm lint` green.
- [ ] `pnpm run docs` completes without TypeDoc warnings or `[warn]` lines.
- [ ] No `@internal` symbol appears in the generated reference; every public symbol
      does.
- [ ] All defaults documented as `` Default: `value`. ``; all cross-references are
      `{@link}`.
- [ ] New files carry the standard header (license + `@module` block).
