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

import type { TFrameConfig } from "../types";
import {
  EditorType,
  ManagerViewMode,
  SDKMode,
  Theme,
  FilterSortOrder,
  FilterSortBy,
  SelectorFilterType,
  HeaderBannerDisplaying,
} from "../enums";

/**
 * The DocSpace CSP validation endpoint. Used internally to check
 * whether the current host domain is allowed in the target DocSpace instance.
 *
 * @see {@link TFrameConfig.checkCSP} — enables/disables CSP validation on frame init.
 */
export const CSPApiUrl = "/api/2.0/security/csp" as const;

/**
 * The prefix for iframe `name` attribute. The full name is `{FRAME_NAME}__#{frameId}`.
 * Used internally by the postMessage protocol to route messages to the correct frame.
 *
 * @see {@link TFrameConfig.frameId} — the unique identifier appended to this prefix.
 */
export const FRAME_NAME = "frameDocSpace" as const;

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
  /** DocSpace server URL. Must be set — no default. Used as the iframe `src` origin. */
  src: "",
  /** Base navigation path for {@link SDKMode.Manager}. Default: `"/rooms/shared/"`. */
  rootPath: "/rooms/shared/",
  /** Auth token for public rooms ({@link SDKMode.PublicRoom}). `null` = no token. */
  requestToken: null,
  /** Iframe width. CSS value: `"100%"`, `"800px"`, etc. */
  width: "100%",
  /** Iframe height. CSS value: `"100%"`, `"600px"`, etc. */
  height: "100%",
  /** Iframe `name` attribute prefix. Default: {@link FRAME_NAME}. */
  name: FRAME_NAME,
  /** Platform layout type. Affects iframe CSS (e.g. `"mobile"` sets `position: fixed`). See {@link EditorType}. */
  type: EditorType.Desktop,
  /** Unique frame identifier. Used as the DOM element `id` and the postMessage routing key. */
  frameId: "ds-frame",
  /** SDK mode. Determines UI and available methods. See {@link SDKMode}. */
  mode: SDKMode.Manager,
  /** Entity ID (file, folder, or room) for modes that require it ({@link SDKMode.Editor}, {@link SDKMode.Viewer}, {@link SDKMode.Uploader}). `null` = none. */
  id: null,
  /** UI locale as a BCP 47 code (e.g. `"en-US"`, `"ru-RU"`). `null` = DocSpace default. */
  locale: null,
  /** Color theme. See {@link Theme}. Default: follows the OS preference. */
  theme: Theme.System,
  /** Editor UI layout sent to the backend. See {@link EditorType}. */
  editorType: EditorType.Desktop,
  /** Show "Open file location" button in editor/viewer modes. `true` = show, `"event"` = trigger `onEditorCloseCallback` instead. */
  editorGoBack: true,
  /** Content filter for selector modes. See {@link SelectorFilterType}. */
  selectorType: SelectorFilterType.All,
  /** Show "Cancel" button in selector modes. */
  showSelectorCancel: false,
  /** Show header bar in selector modes. */
  showSelectorHeader: false,
  /** Show header bar in mobile manager view. */
  showHeader: false,
  /** Header banner visibility. See {@link HeaderBannerDisplaying}. */
  showHeaderBanner: HeaderBannerDisplaying.None,
  /** Show the current section/room/folder title in manager mode. */
  showTitle: true,
  /** Show the left navigation menu in manager mode. */
  showMenu: false,
  /** Show the filter toolbar in manager mode. */
  showFilter: false,
  /** Show "Sign out" button. */
  showSignOut: true,
  /** HTML string inserted into the placeholder `div` after {@link SDKInstance.destroyFrame} is called. */
  destroyText: "",
  /** Item layout in manager mode. See {@link ManagerViewMode}. */
  viewAs: ManagerViewMode.Row,
  /** Visible table columns when `viewAs` is `"table"`. Comma-separated names: `"Index,Name,Size,Type,Tags"`. */
  viewTableColumns: "Index,Name,Size,Type,Tags",
  /** Validate CSP headers before loading the iframe. Set to `false` to skip the fetch to {@link CSPApiUrl}. */
  checkCSP: true,
  /** Hide the "Actions" button in manager mode. */
  disableActionButton: false,
  /** Show "Manage displayed columns" button in table view. */
  showSettings: false,
  /** Delay iframe rendering. When `true`, the iframe is not appended until `setConfig` is called. Exception: {@link SDKMode.System} always appends. */
  waiting: false,
  /** Skip the loading spinner. `true` = show the iframe immediately with `opacity: 1`. Note: {@link SDKMode.Manager} and {@link SDKMode.System} force this to `false`. */
  noLoader: true,
  /** Show the search bar in selector modes. */
  withSearch: true,
  /** Show breadcrumb navigation in selector modes. */
  withBreadCrumbs: true,
  /** Show subtitle with folder description in selector modes. */
  withSubtitle: true,
  /** File type filter for the file selector. `"ALL"` = no restriction. */
  filterParam: "ALL",
  /** HEX color for the selector accept button. */
  buttonColor: "#5299E0",
  /** Show the info panel toggle button in manager mode. */
  infoPanelVisible: true,
  /** Redirect download links to {@link TFrameEvents.onDownload} instead of downloading directly. */
  downloadToEvent: false,
  /** Default filter/sort/pagination for the file list in manager mode. See {@link TFrameFilter}. */
  filter: {
    /** Items per page. */
    count: "100",
    /** Page number (1-based). */
    page: "1",
    /** Sort direction. See {@link FilterSortOrder}. */
    sortOrder: FilterSortOrder.Descending,
    /** Sort criterion. See {@link FilterSortBy}. */
    sortBy: FilterSortBy.ModifiedDate,
    /** Search query string. Empty = no search. */
    search: "",
    /** Include items from sub-folders in search results. */
    withSubfolders: false,
  },
  /** Editor customization options (toolbar, plugins, macros, etc.). See {@link TEditorCustomization}. */
  editorCustomization: {},
  /** Event handlers. All callbacks are `null` by default (disabled). See {@link TFrameEvents}. */
  events: {
    /** Fired in selector modes when a room or file is selected. Receives the selected item data. */
    onSelectCallback: null,
    /** Fired in selector modes when the dialog is closed or selection is canceled. */
    onCloseCallback: null,
    /** Fired once when the DocSpace app inside the iframe is fully initialized. */
    onAppReady: null,
    /** Fired when the DocSpace app encounters an initialization error. Receives the error message. */
    onAppError: null,
    /** Fired when the document editor is closed (via UI or programmatically). */
    onEditorCloseCallback: null,
    /** Fired after successful user authorization. */
    onAuthSuccess: null,
    /** Fired when the user signs out. */
    onSignOut: null,
    /** Fired on file download when `downloadToEvent` is `true`. Receives the download URL. */
    onDownload: null,
    /** Fired when navigating to an inaccessible or deleted room/folder. */
    onNoAccess: null,
    /** Fired when navigating to a non-existent room/folder. */
    onNotFound: null,
    /** Fired when the iframe content is fully loaded and visible. Triggered by {@link SDKInstance.setIsLoaded}. */
    onContentReady: null,
    /** Fired when the editor is opened from the manager (via context menu, hotkeys, etc.). */
    onEditorOpen: null,
    /** Fired when a file row is clicked in the manager file list. */
    onFileManagerClick: null
  },
} as const;

/**
 * Error message shown when the host domain is not in the DocSpace CSP allowlist.
 * Displayed inside the iframe via `srcdoc` when {@link TFrameConfig.checkCSP} is `true` and validation fails.
 */
export const cspErrorText =
  "The current domain is not set in the Content Security Policy (CSP) settings." as const;

/**
 * Error message passed to {@link TFrameEvents.onAppError} when a method is called
 * before the iframe `load` event fires (i.e. before the postMessage channel is established).
 */
export const connectErrorText = "Message bus is not connected with frame" as const;
