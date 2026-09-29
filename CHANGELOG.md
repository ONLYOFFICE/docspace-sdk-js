# Change Log

## 2.2.0

### Added
- Added Uploader mode
- Added Forms mode
- Added Chat mode
- Added Personal mode (`SDKMode.Personal`, `SDK.initPersonal`, `personalDestination`, `TPersonalSection`); `navigateSection` now also works in Personal mode
- Added `SDKError` and `SDKErrorCode`
- Added OAuth mode: `getToken` (or a static `accessToken`) in the config switches the frame to `Authorization: Bearer` authentication instead of the session cookie, in every mode. The frame requests the token from the host through the `getAuthToken` command and receives it as `onAuthTokenReturn`; a JWT (or a token with `tokenExpiresAt`) is refreshed by the SDK one minute before expiry and pushed into the frame. Added the `onAuthError` event with `TAuthError` and `TAuthErrorCode` (`TOKEN_RESOLVE_FAILED`, `TOKEN_UNAVAILABLE`, `TOKEN_REFRESH_FAILED`, `UNAUTHORIZED`). `login` and `logout` reject with `SDKErrorCode.ModeMismatch` in OAuth mode; the README describes the flow
- Added `TFrameFilter.groupId`: the rooms list in Manager mode shows only the rooms of that room group and keeps the group pinned across search and filters; `getRooms` accepts it too. Script-tag integrations pass it as `groupId=…`. Requires ONLYOFFICE Apps 4.0
- Added `RoomType`, the room types accepted by `createRoom` (form filling `1`, collaboration `2`, custom `5`, public `6`, virtual data `8`, AI `9`)
- Added `SDKErrorCode.ApiError`, `TSDKErrorDetails` and the `status` / `data` fields of `SDKError`: a method call the portal (ONLYOFFICE Apps 4.0) reports as failed rejects with the HTTP status and the error payload; `login` and `createRoom` keep resolving `{ status, message }`
- A `"Wrong method for this mode"` reply rejects with `SDKErrorCode.ModeMismatch`
- Added `methodTimeout` config field
- Added `stylesUrl` and `integrationUrl` config fields
- Added new events: `onNavigate`, `onUploadSuccess`, `onUploadError`, `onCustomAction`, `onContentReady`, `onNoAccess`, `onNotFound`, `onEditorOpen`, `onGetExternalData`, `onSetExternalData`
- Added round-trip delivery for `onGetExternalData`: the handler's return value (sync or `Promise`) is posted back to the iframe via the new `MessageTypes.ExternalDataReturn` envelope and correlated by `callId`
- Added new types: `TGetExternalDataRequest`, `TSetExternalDataPayload`
- Added the upload event payload types `TUploadResult`, `TUploadError`, `TUploadProgress`, `TUploaderUploadResult`, `TUploadedFile`, `TUploaderUploadError`, `TRejectedFile` and `TUploadRejection`; every `TFrameEvents` handler names the modes that emit the event
- Added new instance methods: `navigateSection`, `setCustomActions`, `upload`. `upload` works in Forms and Personal mode; a mode-guarded method called in any other mode rejects its promise with `SDKErrorCode.ModeMismatch` instead of throwing
- Added unit tests for SDK instance class
- Added edge case tests for utils and new modes
- Exported the documented constants `CSPApiUrl`, `FRAME_NAME`, `defaultConfig`, `cspErrorText` and `connectErrorText` from the package entry point
- Exported `TEntityBase` and `TListResponse`, the shared shapes behind `TFileInfo`/`TFolderInfo`/`TRoomInfo` and `TFilesResponse`/`TRoomsResponse`
- Added `TEditorAnonymous` (`TEditorCustomization.anonymous`) and `TCustomContextMenuActions` (`TCustomActionsConfig.contextMenu`) as named types instead of inline object literals
- Added the optional `code` argument to `login` for finishing a two-factor sign-in: the portal answers the first call with a `/confirm/…` url and no session, the second call carries the one-time code. Requires a portal whose SDK dispatcher reads `code`
- Added `TLoginResult`: the resolved shape of `login` — `url` (`"/"` on success, a `/confirm/…` page when a second factor is pending) and the `status`/`message` of a failed attempt
- Added `TSelectedRoom`, `TSelectedFile` and `TRequestTokenInfo`, the payloads of `onSelectCallback` (an array of rooms for the room selector, a single file object for the file selector)
- Added `TEditorOpenPayload` and `TEditorAction`, the payload of `onEditorOpen` (the file plus `share` and `action`)
- Added `AGENTS.md` with the instructions coding agents need (commands, architecture, conventions, definition of done); `CLAUDE.md` imports it and keeps only Claude Code specifics
- Added `CONTRIBUTING.md` (toolchain, commands, branch and release flow) and `context7.json` (Context7 indexing rules and file exclusions)
- Added `pnpm typecheck` (`tsc --noEmit`) and `pnpm check-links` (`tools/check-links.mjs`, checks the external links of README and CONTRIBUTING). CI runs typecheck, the docs generation and the link check in addition to lint, tests, build and the package-contents check

### Changed
- Migrated from Jest to Vitest for testing
- `editorCustomization.uiTheme` takes a `Theme` value (`"Base"`, `"Dark"`, `"System"`), the only values the portal maps to editor themes
- Deprecated `buttonColor` and `viewAs`: ONLYOFFICE Apps 4.0 does not read them
- Config field JSDoc states the modes each field applies to and the portal's actual behaviour
- Every instance method's JSDoc names the modes it works in, and the README carries the method-by-mode table; the README example no longer calls data methods on a System-mode instance, where they reject with `ModeMismatch`
- `createFile`: `templateId` and `formId` are optional and the title may carry an extension, matching the portal
- Generated reference pages carry the source file URL as `custom_edit_url` front matter instead of a "View source on GitHub" link under the title, so the site's "Edit this page" link opens the source on GitHub; the section index pages point at `tools/docs/sections.mjs`. The `APITable` import is a plain MDX import line after the front matter and the `<APITable>` tags are no longer wrapped in `mdx-code-block` fences
- The `Remarks` and `Deprecated` headings of the generated reference use TypeDoc's default text again, without a trailing colon
- Type alias and variable pages of the generated reference open with the description; the `type X = …` / `const X: …` signature block follows it instead of preceding it, so the Markdown twins the site publishes for LLMs open with prose rather than code
- Migrated to pnpm 12: pnpm settings live in `pnpm-workspace.yaml` (`allowBuilds`), the version is pinned via `packageManager`, and `pnpm` is no longer a devDependency. Contributors need a global pnpm 11 or newer
- Updated the toolchain: TypeScript 6, Vitest 4, ESLint 10, jsdom 30, esbuild 0.28, TypeDoc 0.28.20. All dependency overrides were removed; `pnpm audit` reports no known vulnerabilities
- Updated the TypeDoc plugins (typedoc-plugin-markdown 4.13, typedoc-docusaurus-theme 1.4.3, typedoc-plugin-frontmatter 1.3.2). Three reference pages change formatting only: signatures wrap the last parameter onto its own line, parameters with default values are marked optional (`SDKError`, `setConfig`), and function types inside unions are parenthesised in the `TFrameEvents` table. Headings, anchors and the sidebar are unchanged
- The IIFE bundle targets Safari 14.1 instead of 14.0: esbuild 0.27.6+ treats destructuring in Safari 14.0 as unsupported. The emitted code is unchanged
- Updated documentation for SDK, SDKInstance, types, utils, enums, and constants
- `setIsLoaded` is documented as a public method again: it reveals the frame and fires `onContentReady`, and can be called by the host to take over the loading hand-off
- The product is called ONLYOFFICE Apps throughout the documentation, README and examples; example hosts are `portal.example.com`. Nothing that integrations rely on changed: the package name, the `window.DocSpace.SDK` global, the `frameDocSpace` iframe name prefix and the script URL keep their spelling
- Refactored `SDKInstance` internals
- Refactored `getFramePath`
- `onSelectCallback`, `onEditorOpen` and `onFileManagerClick` are typed with their real payloads instead of `object`; `login` returns `Promise<TLoginResult>` instead of `Promise<object>`
- `login` documents that the portal's SDK dispatcher forwards only `email` and `passwordHash` and always requests a persistent session; the `password` and `session` arguments do not reach the portal
- `destroyFrame` documents that it is synchronous, rejects pending calls with `SDKErrorCode.Disconnected` and leaves the placeholder ready for an immediate `init*`
- `initChat`, `agentId` and `getToken` document the conditions under which the chat renders and how the OAuth token is forwarded
- `pnpm run docs` runs the Markdown post-processing in strict mode (`tools/docs/index.mjs --strict`): a `[warn]` line (unresolved anchor, duplicate table row id, nested member) fails the run instead of being a note in the log
- `package.json` `description`, `homepage` and `keywords` describe what the SDK embeds and point at the Embed SDK documentation instead of the corporate site
- The first paragraph of the README, the package description and `context7.json` name ONLYOFFICE DocSpace once as the previous name of ONLYOFFICE Apps, so searches and indexers by either name find the SDK; everywhere else the product stays ONLYOFFICE Apps

### Fixed
- `getConfigFromParams` copies `defaultConfig.filter` instead of writing the script-tag filter parameters into the shared defaults, so a second frame on the page no longer inherits the first one's `count`, `search` or `groupId`
- `SDK` is exported by name from the package entry, as the README and every `@example` show (`import { SDK } from "@onlyoffice/docspace-sdk-js"`); previously the class was available only as the default export
- Error replies from portals that do not flag failures are sanitized: `config`, `request` and `stack` are removed before the promise resolves, so a failed `login` no longer exposes the password hash to the host page
- `executeInEditor` callback type corrected to `(editor, asc, data?)`: the editor frame calls it with three arguments (the DocsAPI editor object, `window.Asc`, then `data`). The previous `(instance, data?)` type made `window.Asc` land in the `data` parameter. Documentation now states that the connector must be created by the callback (`editor.createConnector()`) and shows the `Asc.scope` channel for `callCommand`.
- Personal mode now propagates `providerName`, `inviteKey`, `emplType`, and `uid` to the iframe URL, matching Forms and Chat. Previously these OAuth bootstrap params passed to `SDK.initPersonal` were silently dropped, so embedding hosts (e.g. Nextcloud) could not auto-authenticate the user via the configured provider.
- Fixed wrong config merge in `setConfig`
- Fixed wrong error message in SDK instance
- Restored missing `withReload` option for `setConfig`
- Fixed links processing and examples in documentation
- Fixed container reinit and target check in `init*`
- Fixed `isConnected` state handling
- Fixed method rejection cleanup and mode-guard validation
- `validateCSP` attaches the original error as `cause` to the thrown `CSP validation failed` error
- `vitest run --coverage` no longer crashes: the `brace-expansion` override pinned a version incompatible with `minimatch`
- README links to the API reference and the React component pointed at pages that do not exist (`/docspace/javascript-sdk/` and `/get-started/react-component/`); they now lead to the reference index, the Getting Started guide and the React samples

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
