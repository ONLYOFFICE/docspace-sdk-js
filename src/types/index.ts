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
 * sdk.initFrame({ frameId: 'ds-frame', src: 'https://docspace.example.com', mode: 'manager' });
 * // equivalent to:
 * sdk.initFrame({ frameId: 'ds-frame', src: 'https://docspace.example.com', mode: SDKMode.Manager });
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
  /** Anonymous user settings. */
  anonymous?: {
    /** Prompt for anonymous name on open. Default: `true`. */
    request?: boolean;
    /** Postfix for anonymous user name. Default: `"Guest"`. */
    label?: string;
  };
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
  /** Collapse the right panel on first load. Default: `true`. */
  hideRightMenu?: boolean;
  /** Hide rulers. Available for document and presentation editors. Default: `false` (documents), `true` (presentations). */
  hideRulers?: boolean;
  /** Integration mode. Set to `"embed"` to prevent auto-scroll to the editor frame on load. */
  integrationMode?: string;
  /** Enable macros auto-run. `false` disables macros entirely (since v9.0.3). Default: `true`. */
  macros?: boolean;
  /** Macros auto-run policy: `"disable"` | `"warn"` | `"enable"`. Default: `"warn"`. */
  macrosMode?: string;
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
  /** Editor theme ID or preset. IDs: `"theme-light"`, `"theme-classic-light"`, `"theme-dark"`, `"theme-contrast-dark"`, `"theme-white"`, `"theme-night"`. Presets: `"default-dark"`, `"default-light"`. Default: `"theme-classic-light"`. */
  uiTheme?: string;
  /** Ruler/dialog measurement units: `"cm"` | `"pt"` | `"inch"`. Default: `"cm"`. */
  unit?: string;
  /** Zoom percentage. `> 0` for explicit zoom, `-1` = fit to page, `-2` = fit to width. Default: `100`. */
  zoom?: number;
};

/**
 * Filter and pagination parameters for the file list in {@link SDKMode.Manager} mode.
 * Passed via {@link TFrameConfig.filter}.
 *
 * @example
 * ```typescript
 * sdk.initFrame({
 *   mode: "manager",
 *   filter: { count: "50", sortBy: "AZ", sortOrder: "ascending" },
 *   ...
 * });
 * ```
 */
export type TFrameFilter = {
  /** Items per page. Default: `"100"`. */
  count?: string;
  /** Target folder ID. Set automatically when {@link TFrameConfig.id} is provided in manager mode. */
  folder?: string;
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
 * Event handler map for the DocSpace iframe. Passed via {@link TFrameConfig.events}.
 * All handlers are optional — set to `null` (default) to disable.
 *
 * Events are delivered from the iframe to the host via the `onEventReturn` postMessage type.
 *
 * @example
 * ```typescript
 * sdk.initFrame({
 *   events: {
 *     onAppReady: () => console.log("DocSpace loaded"),
 *     onAppError: (err) => console.error("Init error:", err),
 *     onSelectCallback: (item) => console.log("Selected:", item),
 *   },
 *   ...
 * });
 * ```
 */
export type TFrameEvents = {
  /** Fired when the DocSpace app encounters an initialization or runtime error. Receives the error message string. */
  onAppError?: null | ((e?: Event | object | string) => void);
  /** Fired once when the DocSpace app inside the iframe is fully initialized and ready. */
  onAppReady?: null | ((e?: Event | object | string) => void);
  /** Fired after successful user authorization inside the iframe. */
  onAuthSuccess?: null | ((e?: Event | object | string) => void);
  /** Fired in selector modes ({@link SDKMode.RoomSelector}, {@link SDKMode.FileSelector}) when the dialog is closed or canceled. */
  onCloseCallback?: null | ((e?: Event | object | string) => void);
  /** Fired when the iframe content is fully loaded and visible. Triggered internally by {@link SDKInstance.setIsLoaded}. */
  onContentReady?: null | ((e?: Event | object | string) => void);
  /** Fired on file download when {@link TFrameConfig.downloadToEvent} is `true`. Receives the download URL. */
  onDownload?: null | ((e?: Event | object | string) => void);
  /** Fired when the document editor is closed (via UI button, hotkey, or programmatically). */
  onEditorCloseCallback?: null | ((e?: Event | object | string) => void);
  /** Fired when navigating to an inaccessible or deleted room/folder. */
  onNoAccess?: null | ((e?: Event | object | string) => void);
  /** Fired when navigating to a non-existent room/folder (404). */
  onNotFound?: null | ((e?: Event | object | string) => void);
  /** Fired in selector modes when a room or file is selected. Receives the selected item data. */
  onSelectCallback?: null | ((e?: Event | object | string) => void);
  /** Fired when the user signs out from the DocSpace account. */
  onSignOut?: null | ((e?: Event | object | string) => void);
  /** Fired when the editor is opened from the manager (context menu, hotkeys, modal, panel). */
  onEditorOpen?: null | ((e?: Event | object | string) => void);
  /** Fired when a file row is clicked in the manager file list. */
  onFileManagerClick?: null | ((e?: Event | object | string) => void);
  /** Fired when a file upload completes successfully. Works in {@link SDKMode.Uploader} and {@link SDKMode.Forms} modes. */
  onUploadSuccess?: null | ((e?: Event | object | string) => void);
  /** Fired when a file upload fails. Works in {@link SDKMode.Uploader} and {@link SDKMode.Forms} modes. */
  onUploadError?: null | ((e?: Event | object | string) => void);
  /** Fired on file upload progress update. {@link SDKMode.Uploader} mode only. */
  onUploadProgress?: null | ((e?: Event | object | string) => void);
  /** Fired when a custom context menu action is clicked in {@link SDKMode.Forms}. Receives action key and item data. */
  onCustomAction?: null | ((e?: Event | object | string) => void);
  /** Fired when the user navigates to a different section in {@link SDKMode.Forms}. Receives the new path as a string (e.g. `"/rooms/shared/123"`). */
  onNavigate?: null | ((e?: Event | object | string) => void);
};

/**
 * The main configuration object for initializing a DocSpace frame.
 * Passed to {@link SDKInstance.initFrame} or any `SDK.init*` wrapper.
 *
 * Only `frameId`, `mode`, and `src` are required — all other fields have defaults from {@link defaultConfig}.
 *
 * @example
 * ```typescript
 * const config: TFrameConfig = {
 *   frameId: "ds-frame",
 *   src: "https://docspace.example.com",
 *   mode: "manager",
 *   width: "100%",
 *   height: "700px",
 *   theme: "Dark",
 * };
 * sdk.initFrame(config);
 * ```
 */
export type TFrameConfig = {
  /** Skip the loading spinner. `true` = iframe appears immediately. Note: {@link SDKMode.Manager} and {@link SDKMode.System} force `false`. Default: `true`. */
  noLoader?: boolean;
  /** Room type filter for selector modes. */
  roomType?: string;
  /** Custom label for the selector "Accept" button. */
  acceptButtonLabel?: string;
  /** Custom label for the selector "Cancel" button. */
  cancelButtonLabel?: string;
  /** HEX color for the selector accept button. Default: `"#5299E0"`. */
  buttonColor?: string;
  /** Validate CSP headers before loading the iframe. `false` skips the fetch to {@link CSPApiUrl}. Default: `true`. */
  checkCSP?: boolean;
  /** HTML string inserted into the placeholder `div` after {@link SDKInstance.destroyFrame}. Default: `""`. */
  destroyText?: string;
  /** Hide the "Actions" button in {@link SDKMode.Manager}. Default: `false`. */
  disableActionButton?: boolean;
  /** Redirect download links to {@link TFrameEvents.onDownload} instead of downloading directly. Default: `false`. */
  downloadToEvent?: boolean;
  /** Editor UI customization. See {@link TEditorCustomization}. Default: `{}`. */
  editorCustomization?: TEditorCustomization | object;
  /** Show "Open file location" in editor. `true` = show button, `"event"` = trigger {@link TFrameEvents.onEditorCloseCallback}. Default: `true`. */
  editorGoBack?: boolean | string;
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
  /** Entity ID (file, folder, or room) for modes that require it ({@link SDKMode.Editor}, {@link SDKMode.Viewer}, {@link SDKMode.Uploader}). Default: `null`. */
  id?: string | number | null;
  /** Show info panel toggle in {@link SDKMode.Manager}. Default: `true`. */
  infoPanelVisible?: boolean;
  /** Reserved. Controls whether the frame should auto-initialize. */
  init?: boolean | null;
  /** UI locale as a BCP 47 code (e.g. `"en-US"`). `null` = DocSpace server default. */
  locale?: string | null;
  /** **Required.** SDK mode. Determines UI and available methods. See {@link SDKMode}. */
  mode: TFrameMode | string;
  /** Iframe `name` attribute prefix. Default: {@link FRAME_NAME}. */
  name?: string;
  /** Auth token for public rooms ({@link SDKMode.PublicRoom}) and shared files. Default: `null`. */
  requestToken?: string | null;
  /** Base navigation path for {@link SDKMode.Manager}. Default: `"/rooms/shared/"`. */
  rootPath?: string;
  /** Content filter for selector modes. See {@link SelectorFilterType}. Default: `"all"`. */
  selectorType?: TSelectorType;
  /** Show filter toolbar in {@link SDKMode.Manager}. Default: `false`. */
  showFilter?: boolean;
  /** Show header bar in mobile manager view. Default: `false`. */
  showHeader?: boolean;
  /** Header banner visibility. See {@link HeaderBannerDisplaying}. Default: `"none"`. */
  showHeaderBanner?: TBannerDisplaying;
  /** Show left navigation menu in {@link SDKMode.Manager} and {@link SDKMode.Forms}. Default: `false`. */
  showMenu?: boolean;
  /** OAuth provider name for automatic authentication in {@link SDKMode.Forms}. E.g. `"nextcloud"`. */
  providerName?: string;
  /** Invitation key for signup via OAuth in {@link SDKMode.Forms}. */
  inviteKey?: string;
  /** Employee type for signup via OAuth in {@link SDKMode.Forms}. */
  emplType?: string;
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
  /** **Required.** DocSpace server URL. Used as the iframe `src` origin. */
  src: string;
  /** Color theme. See {@link Theme}. Default: `"System"`. */
  theme?: TTheme | string;
  /** Platform layout. Affects iframe CSS (e.g. `"mobile"` sets `position: fixed`). See {@link EditorType}. Default: `"desktop"`. */
  type?: TEditorType;
  /** Item layout in {@link SDKMode.Manager}. See {@link ManagerViewMode}. Default: `"row"`. */
  viewAs?: TManagerViewMode;
  /** Visible table columns when `viewAs` is `"table"`. Comma-separated: `"Index,Name,Size,Type,Tags"`. */
  viewTableColumns?: string;
  /** Delay iframe append. When `true`, iframe is not rendered until {@link SDKInstance.setConfig} is called. Exception: {@link SDKMode.System} always renders. Default: `false`. */
  waiting?: boolean;
  /** Iframe width. CSS value: `"100%"`, `"800px"`, etc. Default: `"100%"`. */
  width?: string;
  /** Show breadcrumb navigation in selector modes. Default: `true`. */
  withBreadCrumbs?: boolean;
  /** Show search bar in selector modes. Default: `true`. */
  withSearch?: boolean;
  /** Show subtitle with folder description in selector modes. Default: `true`. */
  withSubtitle?: boolean;
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
};

/**
 * String union of {@link MessageTypes} values. Used in {@link TMessageData.type}.
 * @internal
 */
export type TMessageTypes = `${MessageTypes}`;

/**
 * The postMessage payload structure sent from the DocSpace iframe to the host.
 * Parsed by `SDKInstance.#onMessage`. The `type` field determines how the message is handled.
 *
 * @internal
 * @see {@link MessageTypes} — possible `type` values and their handling logic.
 */
export type TMessageData = {
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
  /** Method parameters. `null` for parameterless methods. */
  data?: object | null;
  /** Method name matching an {@link InstanceMethods} value. */
  methodName: string;
  /** Always `"method"` for method calls. */
  type: string;
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
  contextMenu?: {
    /** Custom actions for file context menus. */
    file?: TCustomContextMenuAction[];
    /** Custom actions for folder context menus. */
    folder?: TCustomContextMenuAction[];
  };
};
