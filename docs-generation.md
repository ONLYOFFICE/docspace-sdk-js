# Documentation Generation Guide

This guide explains how to generate documentation for the ONLYOFFICE DocSpace JavaScript SDK using TypeDoc and related tools.

## Overview

The documentation system uses:
- **TypeDoc** - Main documentation generator that extracts documentation from TypeScript source files
- **typedoc-plugin-markdown** - Converts TypeDoc output to Markdown format
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

## Documentation Structure

The documentation is generated from the following source files:

```
src/
├── constants/index.ts    # SDK constants (CSPApiUrl, FRAME_NAME, error messages, etc.)
├── enums/index.ts        # Enumerations (SDKMode, Theme, EditorType, etc.)
├── instance/index.ts     # SDKInstance class - individual instance management
├── sdk/index.ts          # SDK class - main SDK controller
└── types/index.ts        # Type definitions and interfaces
```

### Output Structure

Generated documentation is placed in the `docs/` directory:

```
docs/
├── index.md                      # Main documentation index
├── typedoc-sidebar.cjs           # Sidebar configuration for Docusaurus
├── classes/                      # Class documentation
│   ├── SDK.md
│   └── SDKInstance.md
├── enumerations/                 # Enum documentation
│   ├── SDKMode.md
│   ├── Theme.md
│   ├── EditorType.md
│   └── ...
├── type-aliases/                 # Type alias documentation
│   ├── TFrameConfig.md
│   ├── TFrameEvents.md
│   └── ...
└── variables/                    # Constant/variable documentation
    ├── CSPApiUrl.md
    ├── FRAME_NAME.md
    └── ...
```

## Configuration

### TypeDoc Configuration (`typedoc.json`)

The documentation generation is configured in `typedoc.json`:

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": [
    "src/constants/index.ts",
    "src/enums/index.ts",
    "src/instance/index.ts",
    "src/sdk/index.ts",
    "src/types/index.ts"
  ],
  "plugin": ["typedoc-plugin-markdown", "typedoc-docusaurus-theme"],
  "out": "docs",
  "entryFileName": "index.md",
  "includeVersion": true,
  "excludeReferences": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "readme": "none",
  "hideBreadcrumbs": true,
  "hidePageHeader": true,
  "categorizeByGroup": true,
  "categoryOrder": [
    "Classes",
    "Interfaces",
    "Types",
    "Enumerations",
    "Functions",
    "Variables"
  ],
  "kindSortOrder": [
    "Document",
    "Project",
    "Module",
    "Namespace",
    "Enum",
    "EnumMember",
    "Class",
    "Interface",
    "TypeAlias",
    "Constructor",
    "Property",
    "Variable",
    "Function",
    "Accessor",
    "Method",
    "Parameter",
    "TypeParameter",
    "TypeLiteral",
    "CallSignature",
    "ConstructorSignature",
    "IndexSignature",
    "GetSignature",
    "SetSignature"
  ],
  "sort": ["source-order"],
  "hideGenerator": true,
  "validation": true,
  "disableSources": false,
  "gitRevision": "main",
  "sourceLinkTemplate": "https://github.com/ONLYOFFICE/docspace-sdk-js/blob/{gitRevision}/{path}#L{line}",
  "sidebar": {
    "autoConfiguration": true,
    "pretty": true
  }
}
```

### Key Configuration Options

- **entryPoints**: Specifies which TypeScript files to include in documentation
- **plugin**: Enables Markdown output and Docusaurus theme
- **out**: Output directory for generated documentation
- **exclude*** options: Control what gets documented (exclude private/protected/internal members)
- **categoryOrder**: Define the order of documentation sections
- **sourceLinkTemplate**: Creates links back to source code on GitHub
- **sidebar**: Auto-generates sidebar configuration for Docusaurus

## Generating Documentation

### Command

```bash
pnpm run docs
```

This command executes `typedoc` using the configuration from `typedoc.json`.

### What Happens During Generation

1. **TypeDoc reads** all entry point files (`src/*/index.ts`)
2. **Parses** TypeScript code and JSDoc comments
3. **Extracts** classes, interfaces, types, enums, functions, and constants
4. **Generates** Markdown files organized by category
5. **Creates** `index.md` with navigation links
6. **Generates** `typedoc-sidebar.cjs` for Docusaurus integration
7. **Links** documentation to source code on GitHub

### Output

After running `pnpm run docs`, you will have:
- Complete Markdown documentation in `docs/`
- Organized by category (classes, enumerations, type-aliases, variables)
- Each symbol documented in its own file
- Source code links for easy navigation
- Docusaurus-compatible sidebar configuration

## Writing Documentation Comments

### JSDoc Format

Documentation is extracted from JSDoc comments in the source code. Follow these guidelines:

#### Class Documentation

```typescript
/**
 * The SDK class is responsible for managing multiple `SDKInstance` objects.
 * It provides methods to initialize instances with different configurations.
 *
 * @remarks
 * - If an instance with the same `frameId` already exists, it will be reinitialized.
 * - Otherwise, a new instance is created and added to the list of instances.
 *
 * @example
 * ```typescript
 * import { SDK } from '@onlyoffice/docspace-sdk-js';
 * 
 * const sdk = new SDK();
 * const instance = sdk.init({
 *   frameId: 'my-docspace',
 *   src: 'https://your-docspace.com'
 * });
 * ```
 */
export class SDK {
  // ...
}
```

#### Method Documentation

```typescript
/**
 * Initializes an SDK instance with the provided configuration.
 *
 * @param config - The configuration object for the SDK instance.
 * @returns The initialized SDK instance.
 *
 * @example
 * ```typescript
 * const instance = sdk.init({
 *   frameId: 'main-docspace',
 *   src: 'https://your-docspace.com',
 *   mode: SDKMode.Manager
 * });
 * ```
 */
init(config: TFrameConfig): SDKInstance {
  // ...
}
```

#### Type/Interface Documentation

```typescript
/**
 * Configuration object for initializing a DocSpace frame.
 *
 * @remarks
 * Only `frameId` and `src` are required. All other properties have defaults.
 */
export type TFrameConfig = {
  /** Unique identifier for the frame. Required. */
  frameId: string;
  
  /** DocSpace server URL. Required. */
  src: string;
  
  /** Frame display mode. Defaults to `SDKMode.Manager`. */
  mode?: TFrameMode;
  
  // ...
};
```

#### Enum Documentation

```typescript
/**
 * Defines the available modes for the DocSpace SDK frame.
 */
export enum SDKMode {
  /** File manager mode - browse and manage files/folders */
  Manager = "manager",
  
  /** Room selector mode - select a room */
  RoomSelector = "room-selector",
  
  /** File selector mode - select files */
  FileSelector = "file-selector",
  
  // ...
}
```

### JSDoc Tags

Commonly used tags:

- `@param` - Document parameters
- `@returns` - Document return values
- `@example` - Provide code examples
- `@remarks` - Additional information
- `@see` - Reference related items
- `@deprecated` - Mark deprecated features
- `@throws` - Document exceptions
- `@internal` - Mark internal APIs (excluded from docs)
- `@public`, `@private`, `@protected` - Visibility modifiers