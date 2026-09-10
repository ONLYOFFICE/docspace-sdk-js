/**
 * (c) Copyright Ascensio System SIA 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @license
 */

/**
 * @module
 * @mergeModuleWith <project>
 */

/**
 * The SDK initialization mode. Passed via {@link TFrameConfig.mode}.
 * Determines the UI and available functionality of the embedded frame.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ mode: SDKMode.Manager, frameId: "ds-frame", src: "https://portal.example.com" });
 * ```
 */
export enum SDKMode {
  /** File/folder browser. Displays a list of entities at `rootPath`. Supports CRUD operations on rooms, folders, and files. Forces `noLoader: false`. */
  Manager = "manager",
  /** Document editor. Requires `id` — the file identifier to open for editing. */
  Editor = "editor",
  /** Read-only document viewer. Requires `id` — the file identifier to open for viewing. */
  Viewer = "viewer",
  /** Room picker dialog. Returns the selected room via `onSelectCallback`. */
  RoomSelector = "room-selector",
  /** File picker dialog. Returns the selected file via `onSelectCallback`. Filterable by `selectorType`. */
  FileSelector = "file-selector",
  /** Headless mode. Renders a blank page with a loader; used to call system methods (e.g. `login`, `logout`) without UI. Forces `noLoader: false`. */
  System = "system",
  /** Public room view. Grants anonymous access to view, edit, comment on, and review documents. Requires `requestToken`. */
  PublicRoom = "public-room",
  /** File upload interface. Uploads files to the folder specified by `id`. */
  Uploader = "uploader",
  /** Forms gallery. Displays forms for the room specified by {@link TFrameConfig.id}. Supports {@link TFrameConfig.showMenu} to toggle the side panel. */
  Forms = "forms",
  /** AI chat interface. Full-page conversation UI, bound to an AI agent when {@link TFrameConfig.agentId} is set, to the current user otherwise. */
  Chat = "chat",
  /** Personal files browser. File/folder manager for the user's personal space (My Documents, Favorites, Recent, Trash). Uses {@link TFrameConfig.personalDestination} to pick the initial section. */
  Personal = "personal",
}

/**
 * The content filter for selector modes ({@link SDKMode.RoomSelector}, {@link SDKMode.FileSelector}).
 * Passed via {@link TFrameConfig.selectorType}.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ mode: SDKMode.FileSelector, selectorType: SelectorFilterType.RoomsOnly, ... });
 * ```
 */
export const enum SelectorFilterType {
  /** No filter — shows rooms and user folders. */
  All = "all",
  /** Shows only rooms. */
  RoomsOnly = "roomsOnly",
  /** Shows only the current user's personal folders. API value: `"userFolderOnly"`. */
  UserOnly = "userFolderOnly",
}

/**
 * The editor/viewer platform layout. Used in two config fields:
 * - {@link TFrameConfig.type} — the iframe platform type (affects CSS and touch behavior).
 * - {@link TFrameConfig.editorType} — the editor UI layout sent to the ONLYOFFICE Apps backend.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ mode: SDKMode.Editor, type: EditorType.Mobile, editorType: EditorType.Mobile, ... });
 * ```
 */
export const enum EditorType {
  /** Standard desktop/laptop layout. Default value. */
  Desktop = "desktop",
  /** Compact layout for embedding into third-party web pages. */
  Embedded = "embedded",
  /** Touch-optimized layout for tablets and smartphones. Sets `position: fixed` and `overflow: hidden` on the iframe. */
  Mobile = "mobile",
}

/**
 * The item layout in {@link SDKMode.Manager} mode.
 * Passed via {@link TFrameConfig.viewAs}.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ mode: SDKMode.Manager, viewAs: ManagerViewMode.Table, ... });
 * ```
 */
export const enum ManagerViewMode {
  /** Vertical list — one item per row with details. */
  Row = "row",
  /** Table with sortable columns. Column visibility is controlled by `viewTableColumns`. */
  Table = "table",
  /** Grid of visual tiles with thumbnails. */
  Tile = "tile",
}

/**
 * The UI color theme. Passed via {@link TFrameConfig.theme}.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ theme: Theme.Dark, ... });
 * ```
 */
export const enum Theme {
  /** Light theme. */
  Base = "Base",
  /** Dark theme. */
  Dark = "Dark",
  /** Follows the OS / browser preferred color scheme. */
  System = "System",
}

/**
 * The sort direction for file/folder lists. Passed via {@link TFrameFilter.sortOrder}.
 */
export const enum FilterSortOrder {
  /** A-Z, oldest first, smallest first. */
  Ascending = "ascending",
  /** Z-A, newest first, largest first. */
  Descending = "descending",
}

/**
 * The sort criterion for file/folder lists. Passed via {@link TFrameFilter.sortBy}.
 *
 * Note: string values are API identifiers and may differ from the enum key names.
 */
export const enum FilterSortBy {
  /** Sort by author name. API value: `"Author"`. */
  Author = "Author",
  /** Sort by creation date. API value: `"DateAndTimeCreation"`. */
  CreationDate = "DateAndTimeCreation",
  /** Sort by last opened date. API value: `"LastOpened"`. */
  LastOpened = "LastOpened",
  /** Sort by last modification date. API value: `"DateAndTime"`. */
  ModifiedDate = "DateAndTime",
  /** Sort alphabetically by name. API value: `"AZ"`. */
  Name = "AZ",
  /** Sort by room. API value: `"Room"`. */
  Room = "Room",
  /** Sort by room type. API value: `"roomType"`. */
  RoomType = "roomType",
  /** Sort by file size. API value: `"Size"`. */
  Size = "Size",
  /** Sort by tags. API value: `"Tags"`. */
  Tags = "Tags",
  /** Sort by file type/extension. API value: `"Type"`. */
  Type = "Type",
  /** Sort by used storage space. API value: `"usedspace"`. */
  UsedSpace = "usedspace",
}

/**
 * The header banner visibility. Passed via {@link TFrameConfig.showHeaderBanner}.
 */
export const enum HeaderBannerDisplaying {
  /** Show all banners (informational + promotional). */
  All = "all",
  /** Show only informational banners. */
  Info = "info",
  /** Hide all banners. */
  None = "none",
}

/**
 * Internal method identifiers sent to the ONLYOFFICE Apps iframe via `postMessage`.
 * These are used internally by {@link SDKInstance} — call the corresponding
 * public methods on the instance instead of using these values directly.
 *
 * @internal
 * @example
 * ```typescript
 * // Do this:
 * const files = await instance.getFiles();
 *
 * // NOT this:
 * instance.#executeMethod(InstanceMethods.GetFiles, null, callback);
 * ```
 */
export const enum InstanceMethods {
  /** Calls `SDKInstance.addTagsToRoom(roomId, tags)`. */
  AddTagsToRoom = "addTagsToRoom",
  /** Calls `SDKInstance.createFile(folderId, title, templateId, formId)`. */
  CreateFile = "createFile",
  /** Calls `SDKInstance.createFolder(parentFolderId, title)`. */
  CreateFolder = "createFolder",
  /** Calls `SDKInstance.createHash(password, hashSettings)`. */
  CreateHash = "createHash",
  /** Calls `SDKInstance.createRoom(title, roomType)`. */
  CreateRoom = "createRoom",
  /** Calls `SDKInstance.createTag(name)`. */
  CreateTag = "createTag",
  /** Calls `SDKInstance.getFiles()`. Returns all files in the current folder. */
  GetFiles = "getFiles",
  /** Calls `SDKInstance.getFolderInfo()`. Returns metadata of the current directory. */
  GetFolderInfo = "getFolderInfo",
  /** Calls `SDKInstance.getFolders()`. Returns all sub-folders. */
  GetFolders = "getFolders",
  /** Calls `SDKInstance.getHashSettings()`. Returns settings for password hashing. */
  GetHashSettings = "getHashSettings",
  /** Calls `SDKInstance.getList()`. Returns all files and folders. */
  GetList = "getList",
  /** Calls `SDKInstance.getRooms(filter)`. Returns rooms matching the filter. */
  GetRooms = "getRooms",
  /** Calls `SDKInstance.getSelection()`. Returns currently selected items. */
  GetSelection = "getSelection",
  /** Calls `SDKInstance.getUserInfo()`. Returns current user or `null` if not authorized. */
  GetUserInfo = "getUserInfo",
  /** Calls `SDKInstance.login(email, passwordHash, code?)`. With `code` set, finishes a two-factor login. */
  Login = "login",
  /** Calls `SDKInstance.logout()`. */
  Logout = "logout",
  /** Calls `SDKInstance.openModal(type, options)`. */
  OpenModal = "openModal",
  /** Calls `SDKInstance.removeTagsFromRoom(roomId, tags)`. */
  RemoveTagsFromRoom = "removeTagsFromRoom",
  /** Calls `SDKInstance.setConfig(config, reload?)`. Updates the frame configuration. */
  SetConfig = "setConfig",
  /** Calls `SDKInstance.setListView(viewType)`. Changes the file list layout. */
  SetListView = "setListView",
  /** Calls `SDKInstance.executeInEditor(callback, data?)`. Runs a serialized callback inside the editor context as `callback(editor, asc, data)`. */
  ExecuteInEditor = "executeInEditor",
  /** Calls `SDKInstance.navigateSection(section)`. Navigates Forms to a specific section. */
  NavigateSection = "navigateSection",
  /** Calls `SDKInstance.setCustomActions(config)`. Registers custom context menu actions. */
  SetCustomActions = "setCustomActions",
}

/**
 * The `postMessage` message types in the iframe ↔ host protocol.
 * Most messages flow **from the ONLYOFFICE Apps iframe to the host page** and are processed
 * in `SDKInstance.#onMessage`. The {@link MessageTypes.UploadFileData} and
 * {@link MessageTypes.ExternalDataReturn} types travel in the opposite direction —
 * the host posts them into the iframe.
 *
 * @internal
 */
export const enum MessageTypes {
  /** The iframe returns the result of a method call (e.g. `getFiles`). The host resolves the pending promise with `methodReturnData`. */
  OnMethodReturn = "onMethodReturn",
  /** The iframe fires a subscribed event (e.g. `onAppReady`). The host calls the matching handler from `config.events`. */
  OnEventReturn = "onEventReturn",
  /** The iframe requests the host to call a public method on the instance (e.g. `setIsLoaded`). */
  OnCallCommand = "onCallCommand",
  /** The iframe reports an error. The host passes it to `config.events.onAppError`. */
  Error = "error",
  /** Binary file upload from the host to the iframe. Used by {@link SDKInstance.upload}. */
  UploadFileData = "uploadFileData",
  /** Host reply to the iframe's `getExternalData` command. Carries the value resolved by {@link TFrameEvents.onGetExternalData} along with the original `callId`. */
  ExternalDataReturn = "onExternalDataReturn",
  /** Host reply to the iframe's `getAuthToken` command (OAuth mode). Carries `{ accessToken, expiresAt? }` resolved from {@link TFrameConfig.getToken}, correlated by `callId`. */
  AuthTokenReturn = "onAuthTokenReturn",
}
