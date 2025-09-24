/**
 * (c) Copyright Ascensio System SIA 2025
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

/** The API endpoint for managing Content Security Policy (CSP) settings. */
export const CSPApiUrl = "/api/2.0/security/csp" as const;

/** The default name for the DocSpace iframe element. */
export const FRAME_NAME = "frameDocSpace" as const;

/**
 * The default configuration object for initializing and embedding a DocSpace frame.
 * 
 * @type {TFrameConfig}
 */
export const defaultConfig: TFrameConfig = {
  /** The source URL to the iframe used to generate links. */
  src: "",
  /** The base path used for DocSpace navigation. By default, opens a list of rooms. */
  rootPath: "/rooms/shared/",
  /** The authorization token for API requests. Used to open public rooms and files in public rooms. */
  requestToken: null,
  /** The iframe width measured in percentages or pixels. */
  width: "100%",
  /** The iframe height measured in percentages or pixels. */
  height: "100%",
  /** The iframe name used for messaging at the SDK level. */
  name: FRAME_NAME,
  /** The platform type used by the browser and affects the parameters of the inserted object. */
  type: EditorType.Desktop,
  /** The unique frame identifier used to refer to the SDK instance. */
  frameId: "ds-frame",
  /** The SDK initialization mode. */
  mode: SDKMode.Manager,
  /** The unique instance identifier used in the SDK initialization modes. */
  id: null,
  /** The language of the DocSpace user interface specified with the four letter language code. */
  locale: null,
  /** The UI theme settings. */
  theme: Theme.System,
  /** The editor mode display type. */
  editorType: EditorType.Desktop,
  /** Specifies whether the "Open file location" button is displayed in the editor. */
  editorGoBack: true,
  /** The filter type used in the selector views. */
  selectorType: SelectorFilterType.All,
  /** Specifies whether the "Cancel" button is displayed in the selector mode. */
  showSelectorCancel: false,
  /** Specifies whether the interface header is displayed in the selector mode. */
  showSelectorHeader: false,
  /** Specifies whether the interface header is displayed in the mobile view manager. */
  showHeader: false,
  /** The display settings of the header banner. */
  showHeaderBanner: HeaderBannerDisplaying.None,
  /** Specifies whether the title of the current section/room/folder is displayed in the DocSpace manager. */
  showTitle: true,
  /** Specifies whether the left menu is displayed in the DocSpace manager. */
  showMenu: false,
  /** Specifies whether the filter options are displayed in the DocSpace manager. */
  showFilter: false,
  /** Specifies whether the "Sign out" button is displayed. */
  showSignOut: true,
  /** The text to display when destroying the frame. It will be inserted into the `div` tag when the "destroyFrame" method is called. */
  destroyText: "",
  /** The default view mode - the way items are arranged in the DocSpace manager.  */
  viewAs: ManagerViewMode.Row,
  /** The comma-separated string of table column names that are displayed in the table view mode. */
  viewTableColumns: "Index,Name,Size,Type,Tags",
  /** Specifies whether to check for the presence of CSP headers before initialization. */
  checkCSP: true,
  /** Specifies whether to disable the "Actions" button in the manager interface. */
  disableActionButton: false,
  /** Specifies whether to display the "Manage displayed columns" button for configuring the table columns in the list view. */
  showSettings: false,
  /** Specifies whether the frame is in the loading state. */
  waiting: false,
  /** Specifies whether to initialize the frame without showing a loading spinner. */
  noLoader: true,
  /** Specifies whether to display "Search" in the selector mode. */
  withSearch: true,
  /** Specifies whether to show breadcrumb navigation in the selector mode. */
  withBreadCrumbs: true,
  /** Specifies whether to display a subtitle with additional comments or descriptions for the current directory. */
  withSubtitle: true,
  /** The filter parameters that facilitate searching files in the selector mode.  */
  filterParam: "ALL",
  /** The HEX code to customize the selector button color. */
  buttonColor: "#5299E0",
  /** Specifies whether to display a button to show the info panel in the DocSpace manager. */
  infoPanelVisible: true,
  /** Specifies whether to handle download links using the `onDownload` event instead of downloading directly. */
  downloadToEvent: false,
  /** The filter parameters that facilitate searching files and folders in the DocSpace manager. */
  filter: {
    /** The number of files and folders displayed on one page. */
    count: "100",
    /** The page number to start from. */
    page: "1",
    /** The sort direction for the list of files and folders. */
    sortOrder: FilterSortOrder.Descending,
    /** The parameter used to sort the list of files and folders. */
    sortBy: FilterSortBy.ModifiedDate,
    /** The query used to search for files and folders. */
    search: "",
    /** Specifies whether to exclude subfolders when searching for files. */
    withSubfolders: false,
  },
  /** The parameters to customize editors. */
  editorCustomization: {},
  /** The callback functions for SDK events. */
  events: {
    /** The function called in the "room-selector" and "file-selector" modes when a room or file is selected, returning information about the selected item. */
    onSelectCallback: null,
    /** The function called in the "room-selector" and "file-selector" modes when the room or file selector is closed or the selection is canceled. */
    onCloseCallback: null,
    /** The function called when SDK is initialized successfully. */
    onAppReady: null,
    /** The function called when SDK is initialized with an error. This error is returned during the initialization. */
    onAppError: null,
    /** The function called when the document editor is closed. */
    onEditorCloseCallback: null,
    /** The function called upon successful authorization. */
    onAuthSuccess: null,
    /** The function called when logging out of the user account. */
    onSignOut: null,
    /** The function called when download events are fired from the manager. The function returns a link to the download object. This event is triggered only when the "downloadToEvent" parameter is specified in the config. */
    onDownload: null,
    /** The function called when trying to initialize the frame in a room or folder that is inaccessible or has been deleted. */
    onNoAccess: null,
    /** The function called when trying to initialize the frame in a room or folder that is not found. */
    onNotFound: null,
    /** The function called when the frame is loaded. */
    onContentReady: null,
    /** The function called when the document editor is opened for creating or editing documents, or filling out forms, from the context menu, modal windows, panels, or hotkeys. */
    onEditorOpen: null,
    /** The function called when a file is clicked in the list of files. */
    onFileManagerClick: null
  },
} as const;

/** The error message displayed when the current domain is not included in the CSP settings. */
export const cspErrorText =
  "The current domain is not set in the Content Security Policy (CSP) settings." as const;

/** The error message displayed when the message bus fails to connect with the embedded frame. */
export const connectErrorText = "Message bus is not connected with frame" as const;
