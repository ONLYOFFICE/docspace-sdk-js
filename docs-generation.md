# Documentation Generation Guide

This guide explains how to generate and write documentation for the ONLYOFFICE DocSpace JavaScript SDK.

## Overview

The documentation system uses:
- **TypeDoc** - Main documentation generator that extracts documentation from TypeScript source files
- **typedoc-plugin-markdown** - Converts TypeDoc output to Markdown format
- **typedoc-plugin-frontmatter** - Adds frontmatter metadata to generated Markdown files
- **typedoc-docusaurus-theme** - Provides Docusaurus-compatible documentation structure

The documentation is automatically generated from JSDoc comments in the TypeScript source code.

## Requirements

- **Node.js** v22 and above
- **pnpm** v10 and above

## Installation

```bash
git clone https://github.com/ONLYOFFICE/docspace-sdk-js.git
cd docspace-sdk-js
pnpm install
```

## Source and Output Structure

Documentation is generated from five entry points:

```
src/
├── constants/index.ts    # SDK constants (CSPApiUrl, FRAME_NAME, defaultConfig, error messages)
├── enums/index.ts        # Enumerations (SDKMode, Theme, EditorType, etc.)
├── instance/index.ts     # SDKInstance class — individual iframe instance management
├── sdk/index.ts          # SDK class — main controller, creates and stores instances
├── types/index.ts        # Type definitions (TFrameConfig, TFrameEvents, etc.)
```

Generated output in `docs/`:

```
docs/
├── index.md                      # Main documentation index
├── typedoc-sidebar.cjs           # Sidebar configuration for Docusaurus
├── classes/                      # Class documentation (SDK, SDKInstance)
├── enumerations/                 # Enum documentation (SDKMode, Theme, etc.)
├── type-aliases/                 # Type alias documentation (TFrameConfig, etc.)
└── variables/                    # Constant/variable documentation (defaultConfig, etc.)
```

## Generating Documentation

### Command

```bash
pnpm run docs
```

This executes a three-step pipeline:

1. **`update-revision.mjs`** — reads the current Git branch name and writes it to `typedoc.json` → `gitRevision`, so source links point to the correct branch on GitHub.
2. **`typedoc`** — parses all entry points, extracts JSDoc comments, and generates Markdown files in `docs/`.
3. **`update-sidebar.mjs`** — post-processes the generated output:
   - Removes escaped underscores (`\_`) from Markdown link text, headings, bold, and italic.
   - Converts `Defined in: [...]` source references to a single `[View source on GitHub](...)` link per file.
   - Adds Docusaurus path prefix (`docspace/javascript-sdk/usage-sdk`) to sidebar IDs.
   - Reverts `gitRevision` back to `master`.

## TypeDoc Configuration

The full configuration is in `typedoc.json`. Key options:

| Option | Value | Purpose |
|---|---|---|
| `entryPoints` | `src/*/index.ts` (5 files) | Source files to document |
| `plugin` | markdown, frontmatter, docusaurus-theme | Output format and integration |
| `out` | `"docs"` | Output directory |
| `sort` | `["alphabetical"]` | Sort members alphabetically within each category |
| `parametersFormat` | `"table"` | Render method parameters as tables |
| `propertiesFormat` | `"table"` | Render type properties as tables |
| `enumMembersFormat` | `"table"` | Render enum members as tables |
| `typeDeclarationFormat` | `"table"` | Render inline type declarations as tables |
| `tableColumnSettings` | `{ "hideSources": true }` | Hide source column from tables |
| `excludePrivate` | `true` | Exclude `private` members |
| `excludeProtected` | `true` | Exclude `protected` members |
| `excludeInternal` | `true` | Exclude members marked with `@internal` |
| `commentStyle` | `"jsdoc"` | Use `/** */` comment style |
| `sourceLinkTemplate` | GitHub blob URL | Link each symbol to its source line on GitHub |
| `validation` | notExported, invalidLink, etc. | Validate documentation quality on generation |
| `sidebar` | `{ autoConfiguration: true }` | Auto-generate Docusaurus sidebar |

## Writing Documentation Comments

### File Header

Every source file must start with a copyright header and module declaration:

```typescript
/**
 * (c) Copyright Ascensio System SIA 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 *
 * @license
 */

/**
 * @module
 * @mergeModuleWith <project>
 */
```

- `@license` marks the copyright block so TypeDoc excludes it from output.
- `@module` + `@mergeModuleWith <project>` merges all entry points into a single flat namespace in the generated docs (instead of separate per-file modules).

### Cross-References with `{@link}`

Use `{@link}` to create navigable links between symbols. This is the primary way to connect related documentation:

```typescript
/**
 * The SDK initialization mode. Passed via {@link TFrameConfig.mode}.
 * Determines the UI and available functionality of the embedded frame.
 */
export enum SDKMode {
  /** File/folder browser. Supports CRUD operations. Forces `noLoader: false`. */
  Manager = "manager",
  /** Document editor. Requires {@link TFrameConfig.id}. */
  Editor = "editor",
}
```

Common patterns:
- Reference a type: `{@link TFrameConfig}`
- Reference a specific field: `{@link TFrameConfig.mode}`
- Reference a class method: `{@link SDKInstance.initFrame}`
- Reference an enum value: `{@link SDKMode.Manager}`
- Reference a constant: `{@link defaultConfig}`

### Internal APIs with `@internal`

Mark types and members that are part of the implementation but should not appear in the public documentation:

```typescript
/**
 * The postMessage payload structure sent from the DocSpace iframe to the host.
 * Parsed by `SDKInstance.#onMessage`.
 *
 * @internal
 * @see {@link MessageTypes} — possible `type` values and their handling logic.
 */
export type TMessageData = {
  // ...
};
```

Types marked `@internal` are excluded from generated docs (`excludeInternal: true` in typedoc.json). Use this for:
- Internal message types (`TMessageData`, `TEventReturnData`, `TTask`)
- Internal enums (`InstanceMethods`, `MessageTypes`)
- Helper types not needed by consumers

### Class Documentation

```typescript
/**
 * Manages multiple {@link SDKInstance} objects and provides convenience wrappers
 * for each {@link SDKMode}.
 *
 * Calling any `init*` method with a `frameId` that already exists reinitializes
 * the existing instance; otherwise a new instance is created and stored in {@link SDK.frames}.
 *
 * @example
 * ```typescript
 * import { SDK } from '@onlyoffice/docspace-sdk-js';
 *
 * const sdk = new SDK();
 * const instance = sdk.initManager({
 *   frameId: 'ds-frame',
 *   src: 'https://docspace.example.com',
 * });
 * ```
 */
export class SDK {
  // ...
}
```

### Method Documentation

```typescript
/**
 * Initializes a frame in {@link SDKMode.Editor} mode — full document editor.
 * Forces `mode` to {@link SDKMode.Editor}. Requires {@link TFrameConfig.id}.
 *
 * @param config - Frame configuration. See {@link TFrameConfig}.
 * @returns The initialized {@link SDKInstance}.
 *
 * @example
 * ```typescript
 * import { SDK, EditorType } from '@onlyoffice/docspace-sdk-js';
 *
 * const sdk = new SDK();
 * const instance = sdk.initEditor({
 *   frameId: 'ds-frame',
 *   src: 'https://docspace.example.com',
 *   id: 42,
 *   editorType: EditorType.Desktop,
 *   editorCustomization: { autosave: true, forcesave: true },
 *   events: {
 *     onAppReady: () => console.log('ready'),
 *     onEditorCloseCallback: () => history.back(),
 *   },
 * });
 * ```
 */
initEditor = (config: TFrameConfig) =>
  this.init({ ...config, mode: SDKMode.Editor });
```

### Type Documentation

Use a top-level JSDoc block for the type itself, and inline `/** */` comments for each field. Include default values where applicable:

```typescript
/**
 * Editor customization options passed via {@link TFrameConfig.editorCustomization}.
 * Controls the editor UI: toolbar, menus, macros, theme, and zoom.
 * Only applies to {@link SDKMode.Editor} and {@link SDKMode.Viewer} modes.
 *
 * @example
 * ```typescript
 * sdk.initFrame({
 *   mode: "editor",
 *   editorCustomization: {
 *     compactToolbar: true,
 *     hideRulers: true,
 *     uiTheme: "theme-dark",
 *   },
 *   ...
 * });
 * ```
 */
export type TEditorCustomization = {
  /** Enable "Autosave" menu option. When `false`, only "Strict" co-editing mode is available. Default: `true`. */
  autosave?: boolean;
  /** Show "Comments" button. When `false`, comments are view-only. Default: `true`. */
  comments?: boolean;
  /** Move action buttons from header to toolbar, making the header compact. Default: `false`. */
  compactHeader?: boolean;
};
```

Inline comment conventions:
- Start with a brief description of what the field controls.
- Add behavioral notes when the value changes behavior (e.g. "When `false`, ...").
- End with `Default: \`value\`.` when a default exists in `defaultConfig`.

### Enum Documentation

```typescript
/**
 * The SDK initialization mode. Passed via {@link TFrameConfig.mode}.
 * Determines the UI and available functionality of the embedded frame.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ mode: SDKMode.Manager, frameId: "ds-frame", src: "https://docspace.example.com" });
 * ```
 */
export enum SDKMode {
  /** File/folder browser. Displays a list of entities at `rootPath`. Supports CRUD operations on rooms, folders, and files. Forces `noLoader: false`. */
  Manager = "manager",
  /** Document editor. Requires `id` — the file identifier to open for editing. */
  Editor = "editor",
  /** Read-only document viewer. Requires `id` — the file identifier to open for viewing. */
  Viewer = "viewer",
}
```

### Constant Documentation

```typescript
/**
 * The default configuration applied to every frame before user overrides.
 * Merge order in {@link SDKInstance.initFrame}: `defaultConfig` → instance config → user config.
 *
 * Override only the fields you need — unset fields fall back to these defaults.
 *
 * @example
 * ```typescript
 * // Minimal config — everything else comes from defaultConfig
 * sdk.initFrame({
 *   frameId: "ds-frame",
 *   src: "https://docspace.example.com",
 *   mode: "manager",
 * });
 * ```
 */
export const defaultConfig: TFrameConfig = {
  /** DocSpace server URL. Must be set — no default. */
  src: "",
  /** Base navigation path for {@link SDKMode.Manager}. Default: `"/rooms/shared/"`. */
  rootPath: "/rooms/shared/",
  // ...
};
```

## JSDoc Tags Reference

Commonly used tags in this project:

| Tag | Usage | Example |
|---|---|---|
| `@param` | Document method parameters | `@param config - Frame configuration.` |
| `@returns` | Document return values | `@returns The initialized SDKInstance.` |
| `@example` | Provide code examples (fenced with ` ```typescript `) | See examples above |
| `@remarks` | Additional context beyond the main description | `@remarks This method forces noLoader to false.` |
| `@see` | Reference related symbols | `@see {@link TFrameConfig}` |
| `@internal` | Exclude from public documentation | `@internal` |
| `@license` | Mark copyright header (excluded from output) | `@license` |
| `@module` | Declare file as a module for TypeDoc | `@module` |
| `@mergeModuleWith` | Merge module into parent namespace | `@mergeModuleWith <project>` |
| `@deprecated` | Mark deprecated features | `@deprecated Use initManager instead.` |
