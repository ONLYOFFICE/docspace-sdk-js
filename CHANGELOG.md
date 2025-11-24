# Change Log

## 2.1.0
## Added
- Added markdown documentation generation with TypeDoc
- Added documentation generation guide (`docs-generation.md`)
- Added `onFileManagerClick` event

## Changed
- Updated ESLint configuration for better code quality
- Updated packages to latest versions
- Optimized build process and configuration
- Improved TypeDoc configuration with markdown plugin
- Enhanced documentation with examples and better descriptions
- Updated grammar and punctuation in documentation
- Fixed typedoc configuration for proper markdown generation
- Restored default `showHeader` value in config
- Fixed `roomType` type for create room method
- Fixed package structure and updated pnpm
- Removed old markdown generator script in favor of TypeDoc

## Fixed
- Fixed docs generation process
- Fixed examples for SDK class
- Reverted `editorOpenEvent` option and properly implemented it

## 2.0.0
## Added
- Added base SDK class tests
- Added typedoc documentation
- Added Index column to viewTableColumns parameter of default config
- Added isSDK flag for editor modes
- Added noLoader for new modes
- Added executeInEditor method
- Added onEditorOpen event
- Added public-room mode
- Added SSR client support

## Changed
- Improved instance lifecycle management and destruction
- Enhanced render process and message bus stability
- Increased speed of interaction with DocSpace interface
- Extracted CSP validation logic to a separate method
- Modify createLoader, creatFrame
- Migrated from yarn to pnpm
- Fixing code issues

## 1.1.0
## Added
- first release
