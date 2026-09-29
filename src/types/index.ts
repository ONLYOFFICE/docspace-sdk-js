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

import {
  type SDKMode,
  type SelectorFilterType,
  type EditorType,
  type ManagerViewMode,
  type Theme,
  type FilterSortOrder,
  type HeaderBannerDisplaying,
  type FilterSortBy,
  type MessageTypes,
} from "../enums";
import type { SDKInstance } from "../instance";

declare global {
  interface Window {
    DocSpace: {
      SDK: {
        init: (config: TFrameConfig | null) => HTMLIFrameElement;
        frames: Record<string, SDKInstance>;
      };
    };
  }
}

/**
 * String literal union of all {@link SDKMode} values.
 *
 * Accepted by {@link TFrameConfig.mode}. Using the {@link SDKMode} enum constants
 * is preferred, but plain string literals (e.g. `"manager"`, `"editor"`) are equally valid.
 *
 * @example
 * ```typescript
 * sdk.initFrame({ frameId: 'ds-frame', src: 'https://portal.example.com', mode: 'manager' });
 * // equivalent to:
 * sdk.initFrame({ frameId: 'ds-frame', src: 'https://portal.example.com', mode: SDKMode.Manager });
 * ```
 */
export type TFrameMode = `${SDKMode}`;

/**
 * String literal union of all {@link SelectorFilterType} values.
 *
 * Accepted by {@link TFrameConfig.selectorType} in {@link SDKMode.FileSelector} mode.
 * Using the {@link SelectorFilterType} enum constants is preferred.
 */
export type TSelectorType = `${SelectorFilterType}`;

/**
 * String literal union of all {@link EditorType} values.
 *
 * Accepted by {@link TFrameConfig.editorType} and {@link TFrameConfig.type}.
 * Using the {@link EditorType} enum constants is preferred.
 */
export type TEditorType = `${EditorType}`;

/**
 * String literal union of all {@link ManagerViewMode} values.
 *
 * Accepted by {@link TFrameConfig.viewAs} in {@link SDKMode.Manager} mode.
 * Using the {@link ManagerViewMode} enum constants is preferred.
 */
export type TManagerViewMode = `${ManagerViewMode}`;

/**
 * String literal union of all {@link Theme} values.
 *
 * Accepted by {@link TFrameConfig.theme} to control the iframe color scheme.
 * Using the {@link Theme} enum constants is preferred.
 */
export type TTheme = `${Theme}`;

/**
 * String literal union of all {@link FilterSortOrder} values.
 *
 * Accepted by {@link TFrameFilter.sortOrder}.
 * Using the {@link FilterSortOrder} enum constants is preferred.
 */
export type TFilterSortOrder = `${FilterSortOrder}`;

/**
 * String literal union of all {@link HeaderBannerDisplaying} values.
 *
 * Accepted by {@link TFrameConfig.showHeaderBanner}.
 * Using the {@link HeaderBannerDisplaying} enum constants is preferred.
 */
export type TBannerDisplaying = `${HeaderBannerDisplaying}`;

/**
 * String literal union of all {@link FilterSortBy} values.
 *
 * Accepted by {@link TFrameFilter.sortBy}.
 * Using the {@link FilterSortBy} enum constants is preferred.
 */
export type TFilterSortBy = `${FilterSortBy}`;

/**
 * Anonymous user settings for the editor, passed via {@link TEditorCustomization.anonymous}.
 * Controls how a user who is not signed in is named in co-editing and comments.
 *
 * @example
 * ```typescript
 * sdk.initEditor({
 *   editorCustomization: {
 *     anonymous: { request: false, label: "Visitor" },
 *   },
 *   ...
 * });
 * ```
 */
export type TEditorAnonymous = {
  /** Prompt for anonymous name on open. Default: `true`. */
  request?: boolean;
  /** Postfix for anonymous user name. Default: `"Guest"`. */
  label?: string;
};

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
 *     uiTheme: "Dark",
 *   },
 *   ...
 * });
 * ```
 */
export type TEditorCustomization = {
  /** Anonymous user settings. See {@link TEditorAnonymous}. */
  anonymous?: TEditorAnonymous;
  /** Enable "Autosave" menu option. When `false`, only "Strict" co-editing mode is available. Default: `true`. */
  autosave?: boolean;
  /** Show "Comments" button. When `false`, comments are view-only. Default: `true`. */
  comments?: boolean;
  /** Move action buttons from header to toolbar, making the header compact. Default: `false`. */
  compactHeader?: boolean;
  /** Use compact toolbar layout. Default: `false` (edit mode), `true` (view mode since v8.3). */
  compactToolbar?: boolean;
  /** Restrict features to OOXML-compatible only (e.g. no whole-document comments). Default: `false`. */
  compatibleFeatures?: boolean;
  /** Enable force-save on manual "Save" click. Default: `false`. */
  forcesave?: boolean;
  /** Show "Help" button. Default: `true`. */
  help?: boolean;
  /** Collapse the right panel on first load. Unset by default: the editor keeps its own behaviour. */
  hideRightMenu?: boolean;
  /** Hide rulers. Available for document and presentation editors. Default: `false` (documents), `true` (presentations). */
  hideRulers?: boolean;
  /** Integration mode. Set to `"embed"` to prevent auto-scroll to the editor frame on load. */
  integrationMode?: "embed";
  /** Enable macros auto-run. `false` disables macros entirely (since v9.0.3). Default: `true`. */
  macros?: boolean;
  /** Macros auto-run policy. Default: `"warn"`. */
  macrosMode?: "disable" | "warn" | "enable";
  /** Mention hint behavior. `true` = user gets notification + access; `false` = notification only. Default: `true`. */
  mentionShare?: boolean;
  /** Open mobile editor in view/edit mode on launch. Default: `true`. */
  mobileForceView?: boolean;
  /** Enable plugins. Default: `true`. */
  plugins?: boolean;
  /** Hide document title on the top toolbar. Default: `false`. */
  toolbarHideFileName?: boolean;
  /** Use flat (highlighted) toolbar tabs instead of distinct tabs. Default: `false`. */
  toolbarNoTabs?: boolean;
  /** Editor color theme: a {@link Theme} value; any other string falls back to `"System"`. Unset by default: the editor follows {@link TFrameConfig.theme}. */
  uiTheme?: TTheme;
  /** Ruler/dialog measurement units. Default: `"cm"`. */
  unit?: "cm" | "pt" | "inch";
  /** Zoom percentage. `> 0` for explicit zoom, `-1` = fit to page, `-2` = fit to width. Default: `100`. */
  zoom?: number;
};

/**
 * Filter and pagination parameters for the file list in {@link SDKMode.Manager} mode.
 * Passed via {@link TFrameConfig.filter} and accepted by {@link SDKInstance.getRooms}.
 *
 * @example
 * ```typescript
 * sdk.initFrame({
 *   mode: "manager",
 *   filter: { count: "50", sortBy: "AZ", sortOrder: "ascending" },
 *   ...
 * });
 * ```
 *
 * @example
 * Only the rooms of one room group, e.g. the rooms attached to a CRM deal.
 * ```typescript
 * sdk.initManager({
 *   frameId: "ds-frame",
 *   src: "https://portal.example.com",
 *   rootPath: "/rooms/shared/",
 *   filter: { groupId: "42" },
 * });
 * ```
 */
export type TFrameFilter = {
  /** Items per page. Default: `"100"`. */
  count?: string;
  /** Target folder ID. Set automatically when {@link TFrameConfig.id} is provided in manager mode. */
  folder?: string;
  /** Room group ID (`GET /api/2.0/files/group`). On the rooms list of {@link SDKMode.Manager} (`rootPath` `/rooms/shared/`) only the rooms of that group are shown, and the group is pinned: search and filters inside the frame stay within it and the group chips are hidden. Also narrows {@link SDKInstance.getRooms}. Requires ONLYOFFICE Apps 4.0. Unset by default. */
  groupId?: string;
  /** Page number (1-based). Default: `"1"`. */
  page?: string;
  /** Search query. Empty string = no search. */
  search?: string;
  /** Sort criterion. See {@link FilterSortBy}. Default: {@link FilterSortBy.ModifiedDate}. */
  sortBy?: TFilterSortBy;
  /** Sort direction. See {@link FilterSortOrder}. Default: {@link FilterSortOrder.Descending}. */
  sortOrder?: TFilterSortOrder;
  /** Include sub-folder contents in search results. Default: `false`. */
  withSubfolders?: boolean;
};

/**
 * Payload the ONLYOFFICE Apps iframe sends when it asks the host to read a value from external storage.
 * Passed to {@link TFrameEvents.onGetExternalData}.
 *
 * The meaning of `key` is defined by the integrator — it is the identifier used on the
 * integrator side to address a specific record in the host's own storage.
 */
export type TGetExternalDataRequest = {
  /** Identifier defined by the integrator. Addresses the record the iframe wants to read. */
  key: string;
  /** Correlation ID generated by the iframe. The SDK echoes it back in the response envelope so the iframe can match parallel requests. */
  callId: number;
};

/**
 * Payload the ONLYOFFICE Apps iframe sends when it asks the host to persist a value in external storage.
 * Passed to {@link TFrameEvents.onSetExternalData}.
 *
 * The shape of `value` is defined by the integrator — typically an object with key/value pairs
 * scoped to the current user in the integrator's storage.
 */
export type TSetExternalDataPayload = {
  /** Identifier defined by the integrator. Addresses the record to write. */
  key: string;
  /** Data to persist under `key`. Opaque to the SDK; typically an object with user-scoped key/value pairs. */
  value: unknown;
};

/**
 * Payload of {@link TFrameEvents.onUploadSuccess} in {@link SDKMode.Forms} and {@link SDKMode.Personal}:
 * one object per file transferred with {@link SDKInstance.upload}. The same object is the resolved value of `upload`.
 */
export type TUploadResult = {
  /** Name of the uploaded file. */
  fileName: string;
  /** Size of the uploaded file in bytes. */
  fileSize: number;
  /** Correlation ID the SDK assigned to the `upload` call. */
  uploadId?: number;
};

/**
 * Payload of {@link TFrameEvents.onUploadError} in {@link SDKMode.Forms} and {@link SDKMode.Personal}:
 * the file transferred with {@link SDKInstance.upload} that the frame could not store.
 */
export type TUploadError = {
  /** Name of the rejected file. */
  fileName: string;
  /** Error message reported by the frame. */
  message: string;
  /** Correlation ID the SDK assigned to the `upload` call. */
  uploadId?: number;
};

/**
 * Payload of {@link TFrameEvents.onUploadProgress} in {@link SDKMode.Uploader}: one event per uploaded chunk of each file.
 */
export type TUploadProgress = {
  /** Upload session ID of the file. */
  sessionId: string;
  /** Name of the file being uploaded. */
  fileName: string;
  /** Chunks uploaded so far. */
  uploadedChunks: number;
  /** Total number of chunks of the file. */
  totalChunks: number;
  /** Progress of this file in percent (`0`–`100`). */
  percent: number;
};

/**
 * A file stored by the {@link SDKMode.Uploader} dialog: the upload session response of the portal.
 * Nested in {@link TUploaderUploadResult.response}.
 */
export type TUploadedFile = {
  /** Upload session ID. */
  id?: number;
  /** ID of the folder the file was uploaded to. */
  folderId?: number;
  /** Version number of the stored file. */
  version?: number;
  /** Title of the stored file, with extension. */
  title?: string | null;
  /** Key of the third-party storage provider, when the folder is a connected storage. */
  providerKey?: string | null;
  /** Whether the upload completed. */
  uploaded?: boolean;
  /** The stored file. See {@link TFileInfo}. */
  file?: TFileInfo;
};

/**
 * One element of the {@link TFrameEvents.onUploadSuccess} payload in {@link SDKMode.Uploader}:
 * the portal's API envelope around the stored file.
 */
export type TUploaderUploadResult = {
  /** The stored file. See {@link TUploadedFile}. */
  response?: TUploadedFile;
  /** Number of items in `response`. */
  count?: number;
  /** HTTP status of the portal's response. */
  status?: number;
  /** HTTP status of the portal's response (duplicate of `status`). */
  statusCode?: number;
};

/** One reason a file was rejected by the {@link SDKMode.Uploader} dialog. Nested in {@link TRejectedFile.errors}. */
export type TUploadRejection = {
  /** Machine-readable reason (`"file-invalid-type"`, `"file-too-large"`, …). */
  code: string;
  /** Human-readable description. */
  message: string;
};

/** A file the {@link SDKMode.Uploader} dialog refused before uploading. Nested in {@link TUploaderUploadError.rejectedFiles}. */
export type TRejectedFile = {
  /** Name of the rejected file. */
  fileName: string;
  /** Size of the rejected file in bytes. */
  fileSize: number;
  /** MIME type of the rejected file. */
  fileType: string;
  /** Why the file was rejected. See {@link TUploadRejection}. */
  errors: TUploadRejection[];
};

/**
 * Payload of {@link TFrameEvents.onUploadError} in {@link SDKMode.Uploader}: the batch failed or some files were refused.
 */
export type TUploaderUploadError = {
  /** Error message. */
  error: string;
  /** Files refused by the dialog's validation, when the error is a validation failure. See {@link TRejectedFile}. */
  rejectedFiles?: TRejectedFile[];
};

/**
 * Event handler map for the ONLYOFFICE Apps iframe. Passed via {@link TFrameConfig.events}.
 * All handlers are optional — set to `null` (default) to disable.
 *
 * Events are delivered from the iframe to the host via the `onEventReturn` postMessage type.
 * Each handler's description names the modes that emit the event; an event the portal sends
 * without data reaches the handler as an empty object (`{}`).
 *
 * @example
 * ```typescript
 * sdk.initFrame({
 *   events: {
 *     onAppReady: () => console.log("ONLYOFFICE Apps loaded"),
 *     onAppError: (err) => console.error("Init error:", err),
 *     onSelectCallback: (item) => console.log("Selected:", item),
 *   },
 *   ...
 * });
 * ```
 */
export type TFrameEvents = {
  /** Fired by the SDK itself, in every mode, on a CSP, message parsing, connection, method timeout or token failure. Receives the error message string. A portal API error does not fire it: the method's promise rejects instead. */
  onAppError?: null | ((message: string) => void);
  /** Fired in OAuth mode only, when no access token can be used. Receives a {@link TAuthError} whose `code` names the failure: the SDK could not resolve a token, the frame waited for one in vain, or the portal rejected it. The host should re-authenticate the user or destroy the frame; the frame itself shows a loader and never a sign-in page. */
  onAuthError?: null | ((error: TAuthError) => void);
  /** Fired once, in every mode, when the ONLYOFFICE Apps frame is fully initialized and ready. {@link SDKMode.PublicRoom} without a valid {@link TFrameConfig.id} renders an "Invalid link" page and never fires it. */
  onAppReady?: null | ((data: { frameId: string }) => void);
  /** Fired when the user completes a sign-in through a confirmation link opened inside the frame. Not fired by {@link SDKInstance.login} or the OAuth flow, where {@link TFrameEvents.onAppReady} is the sign of success. */
  onAuthSuccess?: null | ((data: object) => void);
  /** Fired in selector modes ({@link SDKMode.RoomSelector}, {@link SDKMode.FileSelector}) when the dialog is closed or canceled. */
  onCloseCallback?: null | (() => void);
  /** Fired when the iframe content is fully loaded and visible, in every mode. With {@link TFrameConfig.noLoader} `true` the SDK fires it on the iframe's `load` event, otherwise when the portal calls {@link SDKInstance.setIsLoaded}; its order relative to {@link TFrameEvents.onAppReady} is not guaranteed. */
  onContentReady?: null | (() => void);
  /** Fired on file download when {@link TFrameConfig.downloadToEvent} is `true`, in {@link SDKMode.Manager}, {@link SDKMode.PublicRoom} and {@link SDKMode.Personal}. Receives the download URL. */
  onDownload?: null | ((url: string) => void);
  /** Fired in {@link SDKMode.Editor} and {@link SDKMode.Viewer} when the document editor is closed (via UI button, hotkey, or programmatically) while {@link TFrameConfig.editorGoBack} is `"event"`. */
  onEditorCloseCallback?: null | (() => void);
  /** Fired in {@link SDKMode.Manager} and {@link SDKMode.PublicRoom} when navigating to an inaccessible or deleted room/folder, and in {@link SDKMode.Chat} when the frame has no signed-in, non-guest user. */
  onNoAccess?: null | (() => void);
  /** Fired in {@link SDKMode.Manager} and {@link SDKMode.PublicRoom} when navigating to a non-existent room/folder (404). */
  onNotFound?: null | (() => void);
  /** Fired in selector modes when a room or file is selected. {@link SDKMode.RoomSelector} passes an **array** of {@link TSelectedRoom} (one element for a single choice); {@link SDKMode.FileSelector} passes a single {@link TSelectedFile} object. */
  onSelectCallback?: null | ((selection: TSelectedRoom[] | TSelectedFile) => void);
  /** Fired when the user signs out through the portal's profile menu inside the frame. Not fired by {@link SDKInstance.logout}. */
  onSignOut?: null | (() => void);
  /** Fired in {@link SDKMode.Manager}, {@link SDKMode.PublicRoom}, {@link SDKMode.Forms} and {@link SDKMode.Personal} when the frame is about to open the editor (row activation, context menu, hotkey, the "Create" dialog). Receives the file with the requested action — see {@link TEditorOpenPayload}. Registering the handler suppresses the portal's own editor: open the file in a frame of your own. */
  onEditorOpen?: null | ((file: TEditorOpenPayload) => void);
  /** Fired in {@link SDKMode.Manager}, {@link SDKMode.PublicRoom}, {@link SDKMode.Forms} and {@link SDKMode.Personal} when a file row is activated in the list. Files only — a folder click navigates into the folder instead. Receives the portal's file object ({@link TFileInfo}). Registering the handler suppresses the portal's own open action. */
  onFileManagerClick?: null | ((file: TFileInfo) => void);
  /** Fired when files are stored. {@link SDKMode.Uploader}: once per batch of the dialog's own upload, with an array of {@link TUploaderUploadResult}. {@link SDKMode.Forms} and {@link SDKMode.Personal}: once per file transferred with {@link SDKInstance.upload}, with a {@link TUploadResult}; the frame's own upload UI does not fire it there. */
  onUploadSuccess?: null | ((data: TUploadResult | TUploaderUploadResult[]) => void);
  /** Fired when an upload fails. {@link SDKMode.Uploader}: a {@link TUploaderUploadError} for the dialog's own upload, including files refused by validation. {@link SDKMode.Forms} and {@link SDKMode.Personal}: a {@link TUploadError} for a file transferred with {@link SDKInstance.upload}. */
  onUploadError?: null | ((data: TUploadError | TUploaderUploadError) => void);
  /** Fired in {@link SDKMode.Uploader} only, after every uploaded chunk of every file of the dialog's own upload. Receives a {@link TUploadProgress}. Not fired for {@link SDKInstance.upload}. */
  onUploadProgress?: null | ((data: TUploadProgress) => void);
  /** Fired when a custom context menu action registered with {@link SDKInstance.setCustomActions} is clicked in {@link SDKMode.Forms}. Receives action key and item data. */
  onCustomAction?: null | ((data: { action: string; type: string; item: object }) => void);
  /** Fired when the user navigates to a different section in {@link SDKMode.Forms} or {@link SDKMode.Personal}. Receives the active section. */
  onNavigate?: null | ((data: { section: TFormsSection | TPersonalSection }) => void);
  /**
   * Fired when the ONLYOFFICE Apps iframe asks the host to read a value from external storage.
   *
   * The integrator returns the value currently stored for the given `key` (sync or `Promise`);
   * the SDK posts it back to the iframe, correlating the response by `callId`. The meaning of
   * `key` and the shape of the returned value are defined by the integrator — the SDK treats
   * the payload as opaque.
   *
   * If the handler throws or its promise rejects, the error is routed to
   * {@link TFrameEvents.onAppError} and no response is sent.
   */
  onGetExternalData?: null | ((req: TGetExternalDataRequest) => unknown | Promise<unknown>);
  /**
   * Fired when the ONLYOFFICE Apps iframe asks the host to persist a value in external storage.
   *
   * Fire-and-forget: the SDK does not post a response back to the iframe. The handler may
   * return a `Promise`; if the promise rejects (or the handler throws), the error is routed
   * to {@link TFrameEvents.onAppError}. The meaning of `key` and `value` is defined by the
   * integrator — typically `value` is an object with user-scoped key/value pairs.
   */
  onSetExternalData?: null | ((payload: TSetExternalDataPayload) => void | Promise<void>);
};

/**
 * The main configuration object for initializing an ONLYOFFICE Apps frame.
 * Passed to {@link SDKInstance.initFrame} or any `SDK.init*` wrapper.
 *
 * Only `frameId`, `mode`, and `src` are required — all other fields have defaults from {@link defaultConfig}.
 *
 * @example
 * ```typescript
 * const config: TFrameConfig = {
 *   frameId: "ds-frame",
 *   src: "https://portal.example.com",
 *   mode: "manager",
 *   width: "100%",
 *   height: "700px",
 *   theme: "Dark",
 * };
 * sdk.initFrame(config);
 * ```
 */
export type TFrameConfig = {
  /** Skip the loading spinner. `true` = iframe appears immediately. Forced per mode: {@link SDKMode.Manager} and {@link SDKMode.System} always show the spinner (`false`), {@link SDKMode.Forms} and {@link SDKMode.Personal} never do (`true`). Default: `true`. */
  noLoader?: boolean;
  /** Room type filter for {@link SDKMode.RoomSelector}: a {@link RoomType} API value as a string (`"5"` for custom rooms). */
  roomType?: string;
  /** Custom label for the selector "Accept" button. */
  acceptButtonLabel?: string;
  /** Custom label for the selector "Cancel" button. */
  cancelButtonLabel?: string;
  /**
   * HEX color for the selector accept button. Default: `"#5299E0"`.
   * @deprecated ONLYOFFICE Apps 4.0 does not read it; the selector uses the portal theme.
   */
  buttonColor?: string;
  /** Validate the host against the portal's CSP allowlist before loading the iframe (host name and port only). `false` skips the request to {@link CSPApiUrl}; the browser still enforces the portal's `frame-ancestors` header. Default: `true`. */
  checkCSP?: boolean;
  /** Plain text shown in the placeholder `div` after {@link SDKInstance.destroyFrame}. Markup is not rendered. Default: `""`. */
  destroyText?: string;
  /** Timeout in milliseconds for method calls to the iframe. If the iframe does not respond within this time, the call rejects with {@link SDKErrorCode.Timeout} and {@link TFrameEvents.onAppError} fires. Does not apply to {@link SDKInstance.upload}, which has its own 120-second transfer timeout. Default: `30000` (30 seconds). */
  methodTimeout?: number;
  /** Hide the "Actions" button in {@link SDKMode.Manager}. Default: `false`. */
  disableActionButton?: boolean;
  /** Redirect download links to {@link TFrameEvents.onDownload} instead of downloading directly. Default: `false`. */
  downloadToEvent?: boolean;
  /** Editor UI customization. See {@link TEditorCustomization}. Default: `{}`. */
  editorCustomization?: TEditorCustomization;
  /** The "Open file location" button of the editor. `true` = the button opens the file's folder; `"event"` = the button fires {@link TFrameEvents.onEditorCloseCallback} instead (set automatically when the handler is registered); `false` = no button. Default: `true`. */
  editorGoBack?: boolean | "event";
  /** Editor UI layout sent to the backend. See {@link EditorType}. Default: `"desktop"`. */
  editorType?: TEditorType;
  /** Event handlers. See {@link TFrameEvents}. */
  events?: TFrameEvents;
  /** Filter/sort/pagination for the file list. See {@link TFrameFilter}. */
  filter?: TFrameFilter;
  /** File type filter for {@link SDKMode.FileSelector}. `"ALL"` = no restriction. */
  filterParam?: string;
  /** **Required.** Unique frame identifier. Used as the DOM `id` and the postMessage routing key. Default: `"ds-frame"`. */
  frameId: string;
  /** Iframe height. CSS value: `"100%"`, `"600px"`, etc. Default: `"100%"`. */
  height?: string;
  /** Entity ID: the file in {@link SDKMode.Editor} and {@link SDKMode.Viewer}, the target folder in {@link SDKMode.Uploader}, the room in {@link SDKMode.PublicRoom}, the folder to open in {@link SDKMode.Personal}, the form filling room in {@link SDKMode.Forms} (optional there: the room from the portal's Forms settings is used when unset). Default: `null`. */
  id?: string | number | null;
  /** Show info panel toggle in {@link SDKMode.Manager}. Default: `true`. */
  infoPanelVisible?: boolean;
  /** Reserved. Controls whether the frame should auto-initialize. */
  init?: boolean | null;
  /** URL of the integration page. Read from config to return the user back after navigating to external resources (e.g. billing). */
  integrationUrl?: string;
  /** UI locale as a BCP 47 code (e.g. `"en-US"`). Applies to the frame only. `null` = the language configured on the portal or in the signed-in user's profile. */
  locale?: string | null;
  /** **Required.** SDK mode. Determines UI and available methods. See {@link SDKMode}. */
  mode: TFrameMode;
  /** Iframe `name` attribute prefix. Default: {@link FRAME_NAME}. */
  name?: string;
  /** Share key of an external link: the room link in {@link SDKMode.PublicRoom} and {@link SDKMode.Manager}, the file link in {@link SDKMode.Editor} and {@link SDKMode.Viewer}. Ignored by other modes. Obtain it from {@link TRequestTokenInfo.requestToken}. Default: `null`. */
  requestToken?: string | null;
  /**
   * OAuth access-token provider. Supplying `getToken` (or {@link TFrameConfig.accessToken})
   * switches the frame into **OAuth mode**: the SDK obtains a short-lived access token from
   * this callback and hands it to the embedded ONLYOFFICE Apps, which authorizes API calls with
   * `Authorization: Bearer <token>` instead of the session cookie. No cookie is set, so the
   * portal session ends with the frame and cannot outlive a sign-out in the host application.
   *
   * The host backend should perform the OAuth authorization-code / refresh-token exchange and
   * return a fresh, minimally-scoped ONLYOFFICE Apps access token. Never expose `client_secret` or
   * refresh tokens to the browser. The SDK calls `getToken` when the frame asks for a token
   * (at start and after a `401`) and, for a JWT or with {@link TFrameConfig.tokenExpiresAt} set,
   * one minute before the token expires, pushing the fresh token into the frame without a failed request.
   *
   * The SDK forwards the returned string unchanged; the frame sends it as a `Bearer` credential,
   * so it must be a token the portal accepts under that scheme. Because the frame authenticates
   * with the header rather than the session cookie, OAuth mode also works where a browser withholds
   * third-party cookies from a cross-origin iframe. {@link SDKInstance.login} and
   * {@link SDKInstance.logout} reject with {@link SDKErrorCode.ModeMismatch} in OAuth mode: the host
   * owns the session. A rejected or missing token surfaces through {@link TFrameEvents.onAuthError}.
   */
  getToken?: () => string | Promise<string>;
  /**
   * Static OAuth access token (convenience). The SDK wraps it as `getToken: () => accessToken`.
   * The SDK cannot refresh it — prefer {@link TFrameConfig.getToken} for anything longer than the token TTL.
   */
  accessToken?: string;
  /**
   * Expiry of the first access token as epoch milliseconds, for the proactive refresh in OAuth mode.
   * When omitted, the expiry is read from the token's JWT `exp` claim. Tokens obtained by a refresh
   * always use their own `exp` claim; an opaque token without one is refreshed on demand only, after a `401`.
   */
  tokenExpiresAt?: number;
  /** Base navigation path for {@link SDKMode.Manager}. Default: `"/rooms/shared/"`. */
  rootPath?: string;
  /** Content filter for selector modes. See {@link SelectorFilterType}. Default: `"all"`. */
  selectorType?: TSelectorType;
  /** Show filter toolbar in {@link SDKMode.Manager}. Default: `false`. */
  showFilter?: boolean;
  /** Show header bar in mobile manager view. Default: `false`. */
  showHeader?: boolean;
  /** Header banner visibility in {@link SDKMode.Manager}. See {@link HeaderBannerDisplaying}. Default: `"none"`. */
  showHeaderBanner?: TBannerDisplaying;
  /** Show left navigation menu in {@link SDKMode.Manager} and {@link SDKMode.Forms}. Default: `false`. */
  showMenu?: boolean;
  /** Inline-start padding (in px) added to header rows so host overlays
   *  on the left edge (e.g. Nextcloud floating menu) don't cover the
   *  burger / breadcrumbs / chat-header controls. The outer iframe
   *  container is not shifted — only the elements inside the header
   *  move to the right (or to the left in RTL).
   *  Currently honored in {@link SDKMode.Forms}, {@link SDKMode.Personal}
   *  and {@link SDKMode.Chat}. Default: `0`. */
  headerOffset?: number;
  /** Height (in px) of the header component inside the iframe. When unset,
   *  ONLYOFFICE Apps uses its own built-in header height; supply this only to override
   *  it so the embedded UI matches the host application's chrome.
   *  Currently honored in {@link SDKMode.Forms}, {@link SDKMode.Personal}
   *  and {@link SDKMode.Chat}. */
  headerHeight?: number;
  /** OAuth provider name for automatic authentication in {@link SDKMode.Forms}, {@link SDKMode.Chat} and {@link SDKMode.Personal}. E.g. `"nextcloud"`. */
  providerName?: string;
  /** Invitation key for signup via OAuth in {@link SDKMode.Forms}, {@link SDKMode.Chat} and {@link SDKMode.Personal}. */
  inviteKey?: string;
  /** Employee type for signup via OAuth in {@link SDKMode.Forms}, {@link SDKMode.Chat} and {@link SDKMode.Personal}. */
  emplType?: string;
  /** User identifier for {@link SDKMode.Forms}, {@link SDKMode.Chat} and {@link SDKMode.Personal}. */
  uid?: string;
  /** Show "Cancel" button in selector modes. Default: `false`. */
  showSelectorCancel?: boolean;
  /** Show header bar in selector modes. Default: `false`. */
  showSelectorHeader?: boolean;
  /** Show "Manage displayed columns" button in table view. Default: `false`. */
  showSettings?: boolean;
  /** Show "Sign out" button. Default: `true`. */
  showSignOut?: boolean;
  /** Show current section/room/folder title in {@link SDKMode.Manager}. Default: `true`. */
  showTitle?: boolean;
  /** **Required.** ONLYOFFICE Apps portal URL. Used as the iframe `src` origin. */
  src: string;
  /** Absolute `http`/`https` URL of a stylesheet applied inside the frame, in every mode. A relative or non-HTTP URL is dropped silently. The portal loads it cross-origin, so the serving host must allow it with CORS. */
  stylesUrl?: string;
  /** Color theme. See {@link Theme}. Default: `"System"`. */
  theme?: TTheme;
  /** Platform layout. Affects iframe CSS (e.g. `"mobile"` sets `position: fixed`). See {@link EditorType}. Default: `"desktop"`. */
  type?: TEditorType;
  /**
   * Item layout in {@link SDKMode.Manager}. See {@link ManagerViewMode}. Default: `"row"`.
   * @deprecated ONLYOFFICE Apps 4.0 does not read it: the layout is the one the user last chose. Call {@link SDKInstance.setListView} after {@link TFrameEvents.onAppReady} instead.
   */
  viewAs?: TManagerViewMode;
  /** Visible table columns in {@link SDKMode.Manager}. Comma-separated: `"Index,Name,Size,Type,Tags"`. Applies in the table layout only ({@link SDKInstance.setListView}); a column set the user saved in the browser takes precedence. */
  viewTableColumns?: string;
  /** Delay iframe append. When `true`, the iframe is not rendered until {@link SDKInstance.setConfig} is called with `reload = true` (without reload the call rejects with {@link SDKErrorCode.Disconnected}). {@link SDKMode.System} ignores the flag. Default: `false`. */
  waiting?: boolean;
  /** Iframe width. CSS value: `"100%"`, `"800px"`, etc. Default: `"100%"`. */
  width?: string;
  /** Show breadcrumb navigation in selector modes. Default: `true`. */
  withBreadCrumbs?: boolean;
  /** Show search bar in selector modes. Default: `true`. */
  withSearch?: boolean;
  /** Show the subtitle with the folder description in {@link SDKMode.FileSelector}. Not passed to {@link SDKMode.RoomSelector}. Default: `true`. */
  withSubtitle?: boolean;
  /** Initial section to display in {@link SDKMode.Forms}. Determines which page loads when the frame is created, avoiding an extra {@link SDKInstance.navigateSection} call. See {@link TFormsSection}. Default: `"my-forms"`. */
  destination?: TFormsSection;
  /** Initial section to display in {@link SDKMode.Personal}. Determines which page loads when the frame is created, avoiding an extra {@link SDKInstance.navigateSection} call. See {@link TPersonalSection}. Default: `"my-documents"`. */
  personalDestination?: TPersonalSection;
  /** Library ID for {@link SDKMode.Forms} to display only items from a forms library. */
  libraryId?: string;
  /** Link main text in {@link SDKMode.Uploader}. */
  linkMainText?: string;
  /** Secondary description text in {@link SDKMode.Uploader}. */
  secondaryText?: string;
  /** File extensions hint text in {@link SDKMode.Uploader}. */
  extensionsText?: string;
  /** Accepted file extensions for {@link SDKMode.Uploader} (e.g. `".pdf,.docx"`). */
  acceptExtensions?: string;
  /** Allow folder upload in {@link SDKMode.Uploader}. */
  isFolderUpload?: boolean;
  /** Allow multiple file upload in {@link SDKMode.Uploader}. */
  isMultipleUpload?: boolean;
  /** Max single file/folder size in {@link SDKMode.Uploader}. */
  maxPerUploadSize?: string;
  /** Max total upload size in {@link SDKMode.Uploader}. */
  maxTotalUploadSize?: string;
  /** AI agent room ID. Optional in {@link SDKMode.Chat}: when set, the chat is bound to that agent; when omitted, the chat is bound to the current user. The chat renders its composer only for a signed-in user who is not a guest; otherwise the page shows a no-access state and fires {@link TFrameEvents.onNoAccess}. AI disabled on the portal also hides the composer, without the event. */
  agentId?: string | number;
  /**
   * ID of the room or folder the chat is opened from — the user's current
   * location. Optional in {@link SDKMode.Chat}; `undefined` by default.
   * The AI receives it as workspace context and by default scopes tool calls
   * (searches, listings, folder contents) to this location. The current user
   * must have access to the entity, otherwise chat requests are rejected.
   */
  entityId?: string | number;
  /** File ID to attach to the chat composer on init. Optional in {@link SDKMode.Chat}. */
  fileId?: string | number;
  /** Thread ID to resume. Optional in {@link SDKMode.Chat}. */
  threadId?: string;
};

/** User reference in file/folder/room metadata. */
export type TCreatedBy = {
  /** User ID. */
  id?: string;
  /** Display name. */
  displayName?: string;
  /** Profile page URL. */
  profileUrl?: string;
  /** Whether the user has a custom avatar. */
  hasAvatar?: boolean;
  /** Default avatar URL. */
  avatar?: string;
  /** Small avatar URL. */
  avatarSmall?: string;
  /** Medium avatar URL. */
  avatarMedium?: string;
  /** Whether the user is anonymous. */
  isAnonim?: boolean;
};

/**
 * Common fields shared by file, folder, and room metadata.
 * Extended by {@link TFileInfo}, {@link TFolderInfo}, and {@link TRoomInfo}.
 */
export type TEntityBase = {
  /** Entity ID. */
  id: number;
  /** Display name. */
  title: string;
  /** ISO 8601 creation date. */
  created: string;
  /** ISO 8601 last update date. */
  updated: string;
  /** Creator reference. */
  createdBy: TCreatedBy;
  /** Last editor reference. */
  updatedBy: TCreatedBy;
  /** Numeric access level. */
  access: number;
  /** Permission flags. */
  security: Record<string, boolean>;
  /** Whether the entity is shared. */
  shared: boolean;
  /** Whether the entity can be shared. */
  canShare: boolean;
  /** Whether notifications are muted. */
  mute: boolean;
};

/** Editor action the manager requests when it opens a file: `"view"` read-only, `"fill"` form filling, `"edit"` editing. */
export type TEditorAction = "view" | "fill" | "edit";

/**
 * Payload of {@link TFrameEvents.onEditorOpen}: the file the manager is about to open plus the
 * requested action. When the user creates a new document, the payload is the created file and
 * `action` is absent.
 */
export type TEditorOpenPayload = TFileInfo & {
  /** Share key of the room when it was opened by an external link; empty otherwise. */
  share?: string;
  /** Requested editor action. Absent for a freshly created document. */
  action?: TEditorAction;
};

/** One external link of a selected room or file, attached to selector payloads. */
export type TRequestTokenInfo = {
  /** Link ID. */
  id: string;
  /** Whether this is the primary link. */
  primary: boolean;
  /** Link title. */
  title: string;
  /** The share key — the value for {@link TFrameConfig.requestToken}. */
  requestToken: string;
};

/**
 * One selected room in the {@link SDKMode.RoomSelector} payload. {@link TFrameEvents.onSelectCallback}
 * receives an **array** of these; other fields of the selector row pass through unchanged.
 */
export type TSelectedRoom = {
  /** Room ID. */
  id: string | number;
  /** Room title. */
  label: string;
  /** Room icon URL. */
  icon?: string;
  /** Numeric room type. See {@link RoomType}. */
  roomType?: number;
  /** Whether the room has an external link. */
  shared?: boolean;
  /** External links of a public or shared room; `requestTokens[0].requestToken` is the key for {@link SDKMode.PublicRoom}. Absent for rooms without links. */
  requestTokens?: TRequestTokenInfo[];
};

/** The {@link SDKMode.FileSelector} payload of {@link TFrameEvents.onSelectCallback}: a single object, not an array. */
export type TSelectedFile = {
  /** File ID. */
  id: string | number;
  /** File title with extension. */
  title: string;
  /** File extension (e.g. `".docx"`). */
  fileExst?: string;
  /** Numeric file type. */
  fileType?: number;
  /** Folder path titles from the root to the file. */
  path?: string[];
  /** Whether the file sits in a public room. */
  inPublic?: boolean;
  /** Editor document type derived from `fileType`; `null` when unknown. */
  documentType?: string | null;
  /** External links when the file sits in a public room; absent otherwise. */
  requestTokens?: TRequestTokenInfo[];
};

/**
 * Result of {@link SDKInstance.login}. The portal answers by resolving, never by rejecting.
 * Three shapes (client 4.0.0): a signed-in session resolves with `url: "/"`; an account that
 * needs a second factor resolves with `url` pointing at the portal's confirmation page
 * (`/confirm/TfaAuth…` or `/confirm/PhoneAuth…`) and no session — call `login` again with the
 * one-time `code`; a failed attempt resolves with the error the portal caught, carrying `status`
 * and `message`.
 */
export type TLoginResult = {
  /** Where the portal would navigate next: `"/"` after a successful sign-in, or the second-factor page (`/confirm/…`) when a code is still required and no session exists. */
  url?: string;
  /** Echo of the email when a second factor is required. */
  user?: string;
  /** Echo of the password hash when a second factor is required. */
  hash?: string;
  /** HTTP status of a failed attempt (`401` for wrong credentials); absent on success. */
  status?: number;
  /** Error message of a failed attempt. */
  message?: string;
};

/** File information returned by SDK methods. */
export type TFileInfo = TEntityBase & {
  /** File extension (e.g. `".docx"`). */
  fileExst: string;
  /** Numeric file type. */
  fileType: number;
  /** Parent folder ID. */
  folderId: number;
  /** File version number. */
  version: number;
  /** Formatted file size string. */
  contentLength: string;
  /** View capability flags. */
  viewAccessibility: Record<string, boolean>;
  /** Root folder ID. */
  rootFolderId: number;
  /** Root folder type. */
  rootFolderType: number;
  /** Web view URL. */
  webUrl: string;
  /** Numeric file status flags. */
  fileStatus: number;
  /** Thumbnail generation status. */
  thumbnailStatus: number;
  /** Parent folder ID. */
  parentId?: number;
  /** File comment text. */
  comment?: string;
  /** Raw file size in bytes. */
  pureContentLength?: number;
  /** Direct view URL. */
  viewUrl?: string;
  /** Short sharing URL. */
  shortWebUrl?: string;
  /** Whether the file is a form template. */
  isForm?: boolean;
  /** Whether this entry is a folder. */
  isFolder?: boolean;
  /** Whether the file is marked as favorite. */
  isFavorite?: boolean;
  /** Whether downloads are denied. */
  denyDownload?: boolean;
  /** Whether sharing is denied. */
  denySharing?: boolean;
  /** Thumbnail image URL. */
  thumbnailUrl?: string;
  /** Whether the file has an unsaved draft. */
  hasDraft?: boolean;
  /** Whether the file is locked for editing. */
  locked?: boolean;
  /** ID of the user who locked the file. */
  lockedBy?: string;
  /** Version group number. */
  versionGroup?: number;
  /** Parent room type number. */
  parentRoomType?: number;
};

/** Folder information returned by SDK methods. */
export type TFolderInfo = TEntityBase & {
  /** Parent folder ID. */
  parentId: number;
  /** Number of files inside. */
  filesCount: number;
  /** Number of sub-folders inside. */
  foldersCount: number;
  /** Count of new/unread items. */
  new: number;
  /** Root folder ID. */
  rootFolderId: number;
  /** Root folder type. */
  rootFolderType: number;
  /** Whether the folder is pinned. */
  pinned: boolean;
  /** Whether folder indexing is enabled. */
  indexing: boolean;
  /** Whether downloads are denied. */
  denyDownload: boolean;
  /** Room type number. See {@link RoomType}. */
  roomType?: number;
  /** Folder type number. */
  type?: number;
  /** Whether the folder is private. */
  private?: boolean;
  /** Whether the folder is archived. */
  isArchive?: boolean;
  /** Parent room type number. */
  parentRoomType?: number;
  /** Whether the parent is shared. */
  parentShared?: boolean;
  /** User who shared the folder. */
  sharedBy?: TCreatedBy;
  /** Folder owner reference. */
  ownedBy?: TCreatedBy;
};

/** Room logo information. */
export type TLogo = {
  /** Original logo URL. */
  original?: string | null;
  /** Large logo URL. */
  large?: string | null;
  /** Medium logo URL. */
  medium?: string | null;
  /** Small logo URL. */
  small?: string | null;
  /** Logo accent color (hex). */
  color?: string | null;
  /** Cover image data. */
  cover?: object;
};

/** Room information returned by SDK methods. */
export type TRoomInfo = TEntityBase & {
  /** Numeric room type. See {@link RoomType}. */
  roomType: number;
  /** Number of files inside. */
  filesCount: number;
  /** Number of sub-folders inside. */
  foldersCount: number;
  /** Count of new/unread items. */
  new: number;
  /** Tag names assigned to the room. */
  tags: string[];
  /** Room logo. */
  logo: TLogo;
  /** Whether the room is pinned. */
  pinned: boolean;
  /** Whether the room is private. */
  private: boolean;
  /** Whether the current user is in the room. */
  inRoom: boolean;
  /** Parent folder ID. */
  parentId?: number;
  /** Root folder ID. */
  rootFolderId?: number;
  /** Root folder type number. */
  rootFolderType?: number;
  /** Used storage space in bytes. */
  usedSpace?: number;
  /** Storage quota in bytes. */
  quotaLimit?: number;
  /** Whether VDR indexing is enabled. */
  indexing?: boolean;
  /** Whether downloads are denied. */
  denyDownload?: boolean;
  /** Whether the room is archived. */
  isArchive?: boolean;
  /** Whether the room is accessible. */
  isAvailable?: boolean;
  /** Whether the room is a template. */
  isTemplate?: boolean;
  /** Whether the room requires a password. */
  passwordProtected?: boolean;
  /** Watermark settings. */
  watermark?: object;
  /** Auto-deletion settings. */
  lifetime?: object;
};

/** User information returned by {@link SDKInstance.getUserInfo}. */
export type TUserInfo = {
  /** User UUID. */
  id: string;
  /** Login email. */
  email: string;
  /** Login username. */
  userName: string;
  /** Full display name. */
  displayName: string;
  /** First name. */
  firstName: string;
  /** Last name. */
  lastName: string;
  /** Portal admin flag. */
  isAdmin: boolean;
  /** Room admin flag. */
  isRoomAdmin: boolean;
  /** Portal owner flag. */
  isOwner: boolean;
  /** Guest/visitor flag. */
  isVisitor: boolean;
  /** Collaborator flag. */
  isCollaborator: boolean;
  /** LDAP-sourced account. */
  isLDAP: boolean;
  /** SSO-sourced account. */
  isSSO: boolean;
  /** Whether user has an avatar. */
  hasAvatar: boolean;
  /** Default avatar URL. */
  avatar: string;
  /** Small avatar URL. */
  avatarSmall: string;
  /** Medium avatar URL. */
  avatarMedium?: string;
  /** Max avatar URL. */
  avatarMax?: string;
  /** Original avatar URL. */
  avatarOriginal?: string;
  /** Profile page URL. */
  profileUrl: string;
  /** Employee status. */
  status?: number;
  /** Activation status. */
  activationStatus?: number;
  /** UI culture/locale (e.g. `"en-US"`). */
  cultureName?: string;
  /** User groups. */
  groups?: { id: string; name: string; manager: string }[];
  /** Job title. */
  title?: string;
  /** Department. */
  department?: string;
  /** Registered admin modules. */
  listAdminModules?: string[];
  /** Anonymous flag. */
  isAnonim?: boolean;
};

/** Breadcrumb path segment in file/room listing responses. */
export type TPathParts = {
  /** Folder/room ID. */
  id: number;
  /** Folder/room title. */
  title: string;
  /** Room type (only for room segments). */
  roomType?: number;
};

/**
 * Response wrapper for paginated listing methods.
 * Specialized as {@link TFilesResponse} (folders) and {@link TRoomsResponse} (rooms).
 *
 * @typeParam TFolder - The folder-like entry type: {@link TFolderInfo} or {@link TRoomInfo}.
 */
export type TListResponse<TFolder> = {
  /** File entries. */
  files: TFileInfo[];
  /** Folder or room entries. */
  folders: TFolder[];
  /** Current folder info. */
  current: TFolderInfo;
  /** Breadcrumb path. */
  pathParts: TPathParts[];
  /** Pagination start index. */
  startIndex?: number;
  /** Number of items returned. */
  count?: number;
  /** Total items available. */
  total?: number;
  /** Count of new items. */
  new?: number;
};

/** Response wrapper for file/folder listing methods. */
export type TFilesResponse = TListResponse<TFolderInfo>;

/** Response wrapper for room listing methods. */
export type TRoomsResponse = TListResponse<TRoomInfo>;

/** Password hash settings returned by {@link SDKInstance.getHashSettings}. */
export type THashSettings = {
  /** Hash size in bits. */
  size: number;
  /** PBKDF2 iteration count. */
  iterations: number;
  /** Base64-encoded salt. */
  salt: string;
};

/**
 * Failure categories reported through {@link TFrameEvents.onAuthError} in OAuth mode.
 *
 * - `"TOKEN_RESOLVE_FAILED"` — the SDK could not obtain a token: {@link TFrameConfig.getToken} threw or
 *   rejected, or neither `getToken` nor {@link TFrameConfig.accessToken} is set. Fired by the SDK itself.
 * - `"TOKEN_UNAVAILABLE"` — the frame asked for its first token and received none within 10 seconds.
 *   Fired by the portal; usually follows `"TOKEN_RESOLVE_FAILED"`.
 * - `"TOKEN_REFRESH_FAILED"` — the frame asked for a fresh token after a `401` and received none.
 *   Fired by the portal.
 * - `"UNAUTHORIZED"` — the portal still answered `401` with a freshly obtained token: the token is not
 *   accepted, expired or lacks the scopes the page needs. Fired by the portal.
 *
 * @example
 * ```typescript
 * events: {
 *   onAuthError: ({ code }) => {
 *     if (code === "UNAUTHORIZED") redirectToLogin();
 *   },
 * }
 * ```
 */
export type TAuthErrorCode = "TOKEN_RESOLVE_FAILED" | "TOKEN_UNAVAILABLE" | "TOKEN_REFRESH_FAILED" | "UNAUTHORIZED";

/**
 * Payload of {@link TFrameEvents.onAuthError}.
 *
 * @example
 * ```typescript
 * const onAuthError = (error: TAuthError) => {
 *   console.warn(`[${error.code}] ${error.message}`);
 *   instance.destroyFrame();
 * };
 * ```
 */
export type TAuthError = {
  /** The failure category. See {@link TAuthErrorCode}. A portal newer than the SDK may send a code that is not listed. */
  code?: TAuthErrorCode | string;
  /** Human-readable description of the failure. */
  message: string;
};

/**
 * String union of {@link MessageTypes} values. Used in {@link TMessageData.type}.
 * @internal
 */
export type TMessageTypes = `${MessageTypes}`;

/**
 * The postMessage payload structure sent from the ONLYOFFICE Apps iframe to the host.
 * Parsed by `SDKInstance.#onMessage`. The `type` field determines how the message is handled.
 *
 * @internal
 * @see {@link MessageTypes} — possible `type` values and their handling logic.
 */
export type TMessageData = {
  /** Correlation identifier for matching method responses to their requests. */
  callId?: number;
  /** Payload for {@link MessageTypes.OnCallCommand}. Passed as the argument to the called method. */
  commandData?: object;
  /** Method or command name. Used by {@link MessageTypes.OnCallCommand} to invoke a public method on the instance. */
  commandName: string;
  /** Payload for {@link MessageTypes.OnEventReturn}. Contains the event name and its data. */
  eventReturnData?: TEventReturnData;
  /** Error details for {@link MessageTypes.Error}. */
  error?: {
    /** Human-readable error description. */
    message: string;
    /** Optional numeric error code. */
    code?: number;
  };
  /** Frame identifier. Messages with a `frameId` not matching the instance's config are ignored. */
  frameId: string;
  /** Payload for {@link MessageTypes.OnMethodReturn}. Contains the return value of the called method. */
  methodReturnData?: object;
  /** Message type. Determines the handling branch in `SDKInstance.#onMessage`. See {@link MessageTypes}. */
  type: TMessageTypes;
};

/**
 * The `methodReturnData` an ONLYOFFICE Apps portal (client 4.0+) sends when a method call failed.
 * `isError` is the marker; the other fields are the sanitized error the portal caught.
 * `SDKInstance.#handleMethodResponse` turns it into an {@link SDKError} with {@link SDKErrorCode.ApiError}.
 *
 * @internal
 */
export type TMethodError = {
  /** Marks the payload as an error. Always `true`. */
  isError: true;
  /** HTTP status of the failed request, when the portal had one. */
  status?: number;
  /** Error message reported by the portal. */
  message?: string;
  /** Error class name on the portal side (`"AxiosError"`, `"Error"`). */
  name?: string;
  /** Portal-side error code (`"ERR_BAD_REQUEST"`, …). */
  code?: string | number;
};

/**
 * Event data within a {@link MessageTypes.OnEventReturn} message.
 * The `event` field is matched against {@link TFrameEvents} handler names.
 *
 * @internal
 */
export type TEventReturnData = {
  /** Event payload passed as the argument to the handler. */
  data?: object;
  /** Event name. Must match a key in {@link TFrameEvents} (e.g. `"onAppReady"`, `"onSelectCallback"`). */
  event: string;
};

/**
 * Internal message envelope queued by `SDKInstance.#executeMethod` and sent to the iframe via `postMessage`.
 * This is an internal type — consumers interact with the public methods on {@link SDKInstance} instead.
 *
 * @internal
 */
export type TTask = {
  /** Correlation identifier for matching responses to requests. */
  callId?: number;
  /** Method parameters. `null` for parameterless methods. */
  data?: object | null;
  /** Method name matching an {@link InstanceMethods} value. */
  methodName: string;
  /** Always `"method"` for method calls. */
  type: "method";
};

/**
 * Optional settings for {@link SDKInstance.createRoom}.
 */
export type TCreateRoomOptions = {
  /** Storage quota in bytes. */
  quota?: number;
  /** Tag names to assign to the room. */
  tags?: string[];
  /** Accent color (hex). */
  color?: string;
  /** Cover image URL. */
  cover?: string;
  /** Enable VDR file indexing. */
  indexing?: boolean;
  /** Restrict file downloads (VDR). */
  denyDownload?: boolean;
};

/**
 * Navigation sections available in {@link SDKMode.Forms} mode.
 * Used by {@link SDKInstance.navigateSection}.
 *
 * @example
 * ```typescript
 * await instance.navigateSection("completed-forms");
 * ```
 */
export type TFormsSection = "my-forms" | "in-progress" | "completed-forms" | "library" | "settings";

/**
 * Navigation sections available in {@link SDKMode.Personal} mode.
 * Used as {@link TFrameConfig.personalDestination} for the initial section and by
 * {@link SDKInstance.navigateSection} to switch sections at runtime.
 *
 * @example
 * ```typescript
 * const personal = sdk.initPersonal({
 *   frameId: "ds-personal",
 *   src: "https://portal.example.com",
 *   personalDestination: "favorites",
 * });
 * await personal.navigateSection("trash");
 * ```
 */
export type TPersonalSection = "my-documents" | "favorites" | "recent" | "trash" | "settings";

/**
 * A custom context menu action registered via {@link SDKInstance.setCustomActions}.
 * Displayed in the file/folder context menu in {@link SDKMode.Forms}.
 *
 * @example
 * ```typescript
 * const action: TCustomContextMenuAction = {
 *   key: "send-to-crm",
 *   label: "Send to CRM",
 *   icon: "https://example.com/icon.svg",
 *   section: ["completed-forms"],
 * };
 * ```
 */
export type TCustomContextMenuAction = {
  /** Unique action identifier. Returned in {@link TFrameEvents.onCustomAction}. */
  key: string;
  /** Display label in the context menu. */
  label: string;
  /** URL of the action icon. Optional. */
  icon?: string;
  /** Sections where this action is visible. If omitted, shown in all sections. */
  section?: TFormsSection[];
};

/**
 * Custom context menu actions grouped by the entity type they apply to.
 * Passed via {@link TCustomActionsConfig.contextMenu}.
 *
 * @example
 * ```typescript
 * const contextMenu: TCustomContextMenuActions = {
 *   file: [{ key: "export", label: "Export to CRM" }],
 *   folder: [{ key: "share", label: "Share folder" }],
 * };
 * await instance.setCustomActions({ contextMenu });
 * ```
 */
export type TCustomContextMenuActions = {
  /** Custom actions for file context menus. */
  file?: TCustomContextMenuAction[];
  /** Custom actions for folder context menus. */
  folder?: TCustomContextMenuAction[];
};

/**
 * Configuration for custom context menu actions, passed to {@link SDKInstance.setCustomActions}.
 *
 * @example
 * ```typescript
 * await instance.setCustomActions({
 *   contextMenu: {
 *     file: [
 *       { key: "export", label: "Export to CRM" },
 *     ],
 *     folder: [
 *       { key: "share", label: "Share folder" },
 *     ],
 *   },
 * });
 * ```
 */
export type TCustomActionsConfig = {
  /** Context menu actions grouped by entity type. See {@link TCustomContextMenuActions}. */
  contextMenu?: TCustomContextMenuActions;
};
