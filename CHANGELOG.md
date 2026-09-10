# Change Log

## 2.2.0

### Added
- Added Uploader mode
- Added Forms mode
- Added Chat mode
- Added Personal mode (`SDKMode.Personal`, `SDK.initPersonal`, `personalDestination`, `TPersonalSection`); `navigateSection` now also works in Personal mode
- Added `SDKError` and `SDKErrorCode`
- Added `methodTimeout` config field
- Added `stylesUrl` and `integrationUrl` config fields
- Added new events: `onNavigate`, `onUploadSuccess`, `onUploadError`, `onCustomAction`, `onContentReady`, `onNoAccess`, `onNotFound`, `onEditorOpen`, `onGetExternalData`, `onSetExternalData`
- Added round-trip delivery for `onGetExternalData`: the handler's return value (sync or `Promise`) is posted back to the iframe via the new `MessageTypes.ExternalDataReturn` envelope and correlated by `callId`
- Added new types: `TGetExternalDataRequest`, `TSetExternalDataPayload`
- Added new instance methods: `navigateSection`, `setCustomActions`, `upload`
- Added unit tests for SDK instance class
- Added edge case tests for utils and new modes
- Exported `TEntityBase` and `TListResponse`, the shared shapes behind `TFileInfo`/`TFolderInfo`/`TRoomInfo` and `TFilesResponse`/`TRoomsResponse`
- Added `TEditorAnonymous` (`TEditorCustomization.anonymous`) and `TCustomContextMenuActions` (`TCustomActionsConfig.contextMenu`) as named types instead of inline object literals
- Added the optional `code` argument to `login` for finishing a two-factor sign-in; the portal answers the first call with `tfa: true` (or `sms: true`) and no session, the second call carries the one-time code. Requires a portal whose SDK dispatcher reads `code`
- Added `TLoginResult`: the resolved shape of `login`, including the two-factor challenge fields and the `status`/`message` of a failed attempt
- Added `TSelectedRoom`, `TSelectedFile` and `TRequestTokenInfo`, the payloads of `onSelectCallback` (an array of rooms for the room selector, a single file object for the file selector)
- Added `TEditorOpenPayload` and `TEditorAction`, the payload of `onEditorOpen` (the file plus `share` and `action`)

### Changed
- Migrated from Jest to Vitest for testing
- Updated packages and pnpm version
- Updated documentation for SDK, SDKInstance, types, utils, enums, and constants
- `setIsLoaded` is documented as a public method again: it reveals the frame and fires `onContentReady`, and can be called by the host to take over the loading hand-off
- The product is called ONLYOFFICE Apps throughout the documentation, README and examples; example hosts are `portal.example.com`. Nothing that integrations rely on changed: the package name, the `window.DocSpace.SDK` global, the `frameDocSpace` iframe name prefix and the script URL keep their spelling
- Refactored `SDKInstance` internals
- Refactored `getFramePath`
- `onSelectCallback`, `onEditorOpen` and `onFileManagerClick` are typed with their real payloads instead of `object`; `login` returns `Promise<TLoginResult>` instead of `Promise<object>`
- `login` documents that the portal reads only `email` and `passwordHash`; the `password` and `session` arguments are deprecated as ignored
- `destroyFrame` documents that it is synchronous, rejects pending calls with `SDKErrorCode.Disconnected` and leaves the placeholder ready for an immediate `init*`
- `initChat`, `agentId` and `getToken` document the conditions under which the chat renders and how the OAuth token is forwarded

### Fixed
- `executeInEditor` callback type corrected to `(editor, asc, data?)`: the editor frame calls it with three arguments (the DocsAPI editor object, `window.Asc`, then `data`). The previous `(instance, data?)` type made `window.Asc` land in the `data` parameter. Documentation now states that the connector must be created by the callback (`editor.createConnector()`) and shows the `Asc.scope` channel for `callCommand`.
- Personal mode now propagates `providerName`, `inviteKey`, `emplType`, and `uid` to the iframe URL, matching Forms and Chat. Previously these OAuth bootstrap params passed to `SDK.initPersonal` were silently dropped, so embedding hosts (e.g. Nextcloud) could not auto-authenticate the user via the configured provider.
- Fixed wrong config merge in `setConfig`
- Fixed wrong error message in SDK instance
- Restored missing `withReload` option for `setConfig`
- Fixed links processing and examples in documentation
- Fixed container reinit and target check in `init*`
- Fixed `isConnected` state handling
- Fixed method rejection cleanup and mode-guard validation

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
