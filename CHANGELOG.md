# Change Log

## 2.2.0

### Upgrading from 2.1.0
- Portal errors reject. With ONLYOFFICE Apps 4.0 a method the portal reports as failed rejects with `SDKError` (`SDKErrorCode.ApiError`) instead of resolving with the error object; only `login` and `createRoom` keep resolving `{ status, message }`. Code that inspected `result.status` or `result.error` on other methods moves to `catch`
- Messages are accepted from the origin of `src` only. `src` must be the absolute URL the portal is served on; a relative `src` or one that redirects to another origin or scheme leaves the frame silent
- `package.json` declares an `exports` map. The entry points, `./dist/*` files and the `./dist/types/instance` and `./dist/types/types` declaration directories stay importable; other deep paths are not
- Types are stricter: `mode` is a `TFrameMode` (no longer any string), `editorCustomization.uiTheme` is a `Theme`, the `executeInEditor` callback is `(editor, asc, data?)`, and `window.DocSpace.SDK` is typed as `SDK`. JavaScript callers are unaffected
- `createRoom` takes its settings as a `TCreateRoomOptions` object; the positional arguments of 2.1 (`quota`, `tags`, ...) still work and are deprecated

### Added
- `SDKMode.Uploader` and `SDK.initUploader`: an upload dialog with the config fields `linkMainText`, `secondaryText`, `extensionsText`, `acceptExtensions`, `isFolderUpload`, `isMultipleUpload`, `maxPerUploadSize` and `maxTotalUploadSize`, and the events `onUploadSuccess`, `onUploadError` and `onUploadProgress`
- `SDKMode.Forms` and `SDK.initForms`: the forms gallery with the sections of `TFormsSection` (`my-forms`, `in-progress`, `completed-forms`, `library`, `settings`), the config fields `destination` and `libraryId`, the `navigateSection` and `upload` methods and the `onNavigate` event
- `SDKMode.Chat` and `SDK.initChat`: the AI chat with the config fields `agentId`, `entityId`, `fileId` and `threadId`
- `SDKMode.Personal` and `SDK.initPersonal`: the personal files section with the sections of `TPersonalSection` (`my-documents`, `favorites`, `recent`, `shared-with-me`, `trash`, `settings`), the config field `personalDestination`, and `navigateSection`, `upload` and `onNavigate` as in Forms mode
- OAuth mode, available in every mode: `getToken` (or a static `accessToken` with `tokenExpiresAt`) switches the frame to `Authorization: Bearer` authentication instead of the session cookie. The frame requests the token from the host through the `getAuthToken` command; a JWT, or a token with a known expiry, is refreshed one minute before it expires. The `onAuthError` event receives a `TAuthError` with a `TAuthErrorCode` (`TOKEN_RESOLVE_FAILED`, `TOKEN_UNAVAILABLE`, `TOKEN_REFRESH_FAILED`, `UNAUTHORIZED`); `login` and `logout` reject with `SDKErrorCode.ModeMismatch` in OAuth mode
- The OAuth bootstrap fields `providerName`, `inviteKey`, `emplType` and `uid` for automatic sign-in and sign-up in Forms, Chat and Personal mode
- Custom actions in Manager, Personal and Forms mode: context menu items for files, folders and rooms and create menu items, set with the `customActions` config field or `setCustomActions`. Items can be limited by section, file extension, room type and access flags; `onCustomAction` receives the item, the selection and the current folder id (`TCustomActionsConfig`, `TCustomContextMenuActions`, `TCustomContextMenuAction`, `TCustomCreateAction`, `TCustomActionEvent`, `TCustomActionSection`, `TManagerSection`)
- `onGetExternalData` and `onSetExternalData`: the frame asks the host for integrator-defined data and pushes it back. The return value of `onGetExternalData` (sync or `Promise`) is posted to the frame and correlated by `callId` (`TGetExternalDataRequest`, `TSetExternalDataPayload`)
- `SDKError` and `SDKErrorCode`: every new method rejects with an `SDKError` whose `code` names the failure (`Timeout`, `Disconnected`, `CSPViolation`, `ModeMismatch`, `InvalidConfig`, `UploadFailed`, `ParseError`, `TokenResolveFailed`, `ApiError`). A method the portal (ONLYOFFICE Apps 4.0) reports as failed rejects with `SDKErrorCode.ApiError` and carries the HTTP `status` and the error `data` (`TSDKErrorDetails`); a `"Wrong method for this mode"` reply rejects with `SDKErrorCode.ModeMismatch`. `login` and `createRoom` keep resolving with `{ status, message }`
- `methodTimeout` config field: a method call the frame does not answer in time rejects with `SDKErrorCode.Timeout` (default 30 s)
- `stylesUrl` (a stylesheet applied inside the frame, in every mode), `headerOffset` and `headerHeight` (header layout in Forms, Chat and Personal mode), and `openEditorInSameTab` (where a file opens from the list in Forms and Personal mode)
- `TInitConfig`, the parameter type of the `init*` wrappers: a `TFrameConfig` without the `mode` the wrapper sets, so `sdk.initManager({ frameId, src })` compiles in strict TypeScript
- `onFilterSearch` event with `TFilterSearchPayload`: the search text of the file list in Personal and PublicRoom mode
- `RoomType.Private` (`13`), the end-to-end encrypted room type returned by `getRooms` and `onSelectCallback`
- `TAppReadyPayload`, `TNavigatePayload` and `TUserGroup`, the named shapes of `onAppReady`, `onNavigate` and `TUserInfo.groups`
- `TFrameFilter.groupId`: the rooms list in Manager mode shows only the rooms of that room group and keeps the group pinned across search and filters; `getRooms` accepts it too. Script-tag integrations pass it as `groupId=…`. Requires ONLYOFFICE Apps 4.0
- `RoomType`, the room types accepted by `createRoom` (`FormFilling`, `Collaboration`, `Custom`, `Public`, `VirtualData`, `Ai`)
- The optional `code` argument of `login` for finishing a two-factor sign-in: the portal answers the first call with a `/confirm/…` url and no session, the second call carries the one-time code. `login` resolves with a `TLoginResult`
- `upload` sends an `uploadId` with every file and matches the `onUploadSuccess` / `onUploadError` events by it, so two files with the same name no longer resolve each other's promise
- Named exports of the whole public API from the package entry: `SDK`, `SDKInstance`, `SDKError`, `SDKErrorCode`, every enum, the constants `defaultConfig`, `FRAME_NAME`, `CSPApiUrl`, `cspErrorText` and `connectErrorText`, and every `T*` type. Previously only `SDK` was available, as the default export
- Typed payloads for the existing events and methods: `TSelectedRoom` and `TSelectedFile` (`onSelectCallback`), `TEditorOpenPayload` and `TEditorAction` (`onEditorOpen`), `TRequestTokenInfo`, the upload payloads `TUploadResult`, `TUploadError`, `TUploadProgress`, `TUploaderUploadResult`, `TUploadedFile`, `TUploaderUploadError`, `TRejectedFile` and `TUploadRejection`, and the shared shapes `TEntityBase`, `TListResponse`, `TEditorAnonymous` and `TCreateRoomOptions`

### Changed
- `setConfig` takes a `Partial<TFrameConfig>` and merges it into the stored config; a call without arguments no longer resets the config to the defaults
- `createFile`, `createFolder`, `addTagsToRoom` and `removeTagsFromRoom` accept numeric IDs, the type the data methods return
- Personal mode: the frame URL addresses the list page by folder (`/sdk/personal-files?folder=@my`) instead of the section redirect, and no longer carries `showMenu`, `infoPanelVisible` or `downloadToEvent`, which the Personal frame does not read; `initPersonal` no longer forces `showMenu` and `infoPanelVisible` to `true`. The Personal frame has no navigation menu: the host switches sections with `navigateSection`
- `getRooms` sends `search` and `count` under the names the portal's rooms filter reads (`filterValue`, `pageCount`)
- The ESM build ships `dist/esm/package.json` with `"type": "module"`, so Node loads `dist/esm/main.js` as an ES module without the typeless-package warning
- Mode-guarded methods reject their promise with `SDKErrorCode.ModeMismatch` when called in a mode that does not support them instead of throwing synchronously
- `onSelectCallback`, `onEditorOpen` and `onFileManagerClick` are typed with their real payloads instead of `object`; `login` returns `Promise<TLoginResult>` instead of `Promise<object>`
- `editorCustomization.uiTheme` takes a `Theme` value (`"Base"`, `"Dark"`, `"System"`), the only values the portal maps to editor themes
- `createFile`: `templateId` and `formId` are optional and the title may carry an extension, matching the portal
- `executeInEditor` callback type corrected to `(editor, asc, data?)`: the editor frame calls it with the DocsAPI editor object, `window.Asc` and then `data`. The previous `(instance, data?)` type made `window.Asc` land in the `data` parameter. The connector must be created by the callback (`editor.createConnector()`)
- `setIsLoaded` is a public method again: it reveals the frame and fires `onContentReady`, so the host can take over the loading hand-off
- `destroyFrame` is synchronous, rejects pending calls with `SDKErrorCode.Disconnected` and leaves the placeholder ready for an immediate `init*`
- `validateCSP` attaches the original error as `cause` to the thrown `CSP validation failed` error
- The IIFE bundle (`dist/api.js`) targets Safari 14.1 instead of 14.0; the emitted code is unchanged
- `package.json` declares an `exports` map for the package root (ESM, CJS and types); deep imports such as `@onlyoffice/docspace-sdk-js/dist/api.js` are no longer resolvable. `engines.node` is `>=18`
- The product is called ONLYOFFICE Apps throughout the documentation, README and examples; DocSpace is named once as the previous name. Nothing that integrations rely on changed: the package name, the `window.DocSpace.SDK` global, the `frameDocSpace` iframe name prefix and the script URL keep their spelling
- Every config field, event and instance method documents the modes it applies to and the portal's actual behaviour; the README carries the method-by-mode table. `login` documents that the portal forwards only `email` and `passwordHash` and always opens a persistent session

### Deprecated
- `buttonColor` and `viewAs`: ONLYOFFICE Apps 4.0 does not read them. Call `setListView` after `onAppReady` to change the layout
- `integrationUrl`: ONLYOFFICE Apps 4.0 does not read it

### Fixed
- The portal's `setConfig` command carries its origin as `src`; the SDK now uses it only to narrow the message filter instead of overwriting the configured `src`, so a portal served under a sub-path keeps it on reload
- A method reply that arrives after its timeout is dropped instead of resolving the next pending call
- Personal mode kept `theme`, `locale` and the sign-in parameters off the first request: the section route redirected and dropped them
- A `getToken` that rejects is answered to the frame with an empty token reply, so the frame fails fast instead of waiting for its own timeout
- The proactive token refresh timer overflowed for an expiry more than 24.8 days ahead and fired at once
- `dist/api.js` threw at load when `document.currentScript` was `null` (a module script, or `api.js` bundled into another file); the script-tag parser now falls back to the defaults, no longer decodes the whole script URL before reading its parameters (an encoded `&` inside a value split the query) and ignores inherited keys when routing filter parameters
- Messages from another window of the portal origin (a popup, a second frame) are ignored; only the instance's own iframe drives it
- A trailing slash in `src` produced `//` in the iframe URL and the CSP request; a `rootPath` without a trailing slash glued the folder ID to it
- `upload` cleans up its pending entry when `postMessage` throws, and `destroyFrame` restores `overscroll-behavior` on the page body after a mobile frame
- Error replies from portals that do not flag failures are sanitized: `config`, `request` and `stack` are removed before the promise resolves, so a failed `login` no longer exposes the password hash to the host page
- `getConfigFromParams` copies `defaultConfig.filter` instead of writing the script-tag filter parameters into the shared defaults, so a second frame on the page no longer inherits the first one's `count`, `search` or `groupId`
- `setConfig` merged the defaults over the stored config, and its `withReload` option was missing
- Re-initializing a frame no longer registers a second `message` listener
- `init*` on a container whose target element was replaced by a previous frame reuses the existing container instead of returning `null`
- A method called while the iframe is missing rejects with `SDKErrorCode.Disconnected` instead of hanging, and a rejected method no longer surfaces as an unhandled promise rejection when the host only listens to `onAppError`
- `onAppError` received `Unknown error occurred` instead of the portal's message when the error reply was a plain object

### Internal
- Docs pipeline: a deprecated optional member keeps a linkable row id (`~~viewAs~~?`), generic titles in the section indexes are unescaped, and `custom_edit_url` resolves the tag on a release checkout
- Tests run on Vitest instead of Jest; the toolchain is pnpm 12 (pinned via `packageManager`), TypeScript 6, ESLint 10, esbuild 0.28, jsdom 30 and TypeDoc 0.28 with typedoc-plugin-markdown 4.13
- CI runs lint, typecheck (`pnpm typecheck`), tests, build, docs generation, the README link check (`pnpm check-links`), a package-contents check and `pnpm audit`
- Generated reference pages carry the source URL as `custom_edit_url` front matter, open with the description before the signature block and are post-processed in strict mode (`tools/docs/index.mjs --strict`)
- Added `AGENTS.md`, `CONTRIBUTING.md` and `context7.json`

## 2.1.0

### Added
- Added markdown documentation generation with TypeDoc
- Added documentation generation guide (`docs-generation.md`)
- Added `onFileManagerClick` event

### Changed
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

### Fixed
- Fixed docs generation process
- Fixed examples for SDK class
- Reverted `editorOpenEvent` option and properly implemented it

## 2.0.0

### Added
- Added base SDK class tests
- Added typedoc documentation
- Added Index column to viewTableColumns parameter of default config
- Added isSDK flag for editor modes
- Added noLoader for new modes
- Added executeInEditor method
- Added onEditorOpen event
- Added public-room mode
- Added SSR client support

### Changed
- Improved instance lifecycle management and destruction
- Enhanced render process and message bus stability
- Increased speed of interaction with DocSpace interface
- Extracted CSP validation logic to a separate method
- Modify createLoader, creatFrame
- Migrated from yarn to pnpm
- Fixing code issues

## 1.1.0

### Added
- first release
