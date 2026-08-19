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

8. **Regeneration:** `pnpm run docs` (runs update-revision → typedoc →
   update-sidebar). Run it whenever public JSDoc changed, and make sure TypeDoc
   emits **no warnings** (a warning usually means a broken `{@link}` target).

## Verify

```bash
pnpm lint        # naming rules are ESLint-enforced
pnpm run docs    # must complete with zero TypeDoc warnings
```

## Definition of Done

- [ ] `pnpm lint` green.
- [ ] `pnpm run docs` completes without TypeDoc warnings.
- [ ] No `@internal` symbol appears in the generated reference; every public symbol
      does.
- [ ] All defaults documented as `` Default: `value`. ``; all cross-references are
      `{@link}`.
- [ ] New files carry the standard header (license + `@module` block).
