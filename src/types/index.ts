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
/** The template literal type representing the frame mode based on `SDKMode`. */
export type TFrameMode = `${SDKMode}`;

/** The template literal type for the selector filters. */
export type TSelectorType = `${SelectorFilterType}`;

/** The template literal type based on the `EditorType` enum. */
export type TEditorType = `${EditorType}`;

/** The template literal type representing the manager view mode. */
export type TManagerViewMode = `${ManagerViewMode}`;

/** The template literal type representing the theme options. */
export type TTheme = `${Theme}`;

/** The template literal type representing the filter sort order. */
export type TFilterSortOrder = `${FilterSortOrder}`;

/** The template literal type for the display options of the header banner. */
export type TBannerDisplaying = `${HeaderBannerDisplaying}`;

/** The template literal type representing the filter sort options. */
export type TFilterSortBy = `${FilterSortBy}`;

/**
 * The editor customization configuration.
 */
export type TEditorCustomization = {
  /** The anonymous access configuration. */
  anonymous?: {
    /** Specifies whether to request for the anonymous name. The default value is `true`. */
    request?: boolean;
    /** A postfix added to the anonymous user name. The default value is "Guest". */
    label?: string;
  };
  /** Specifies whether to enable or disable the "Autosave" menu option.
   * If set to `false`, only "Strict" co-editing mode can be selected, as "Fast" does not work without autosave. The default value is `true`.
  */
  autosave?: boolean;
  /** Specifies whether to enable or disable the "Comments" menu button.
   * Please note that in case you hide the "Comments" button, the corresponding commenting functionality will be available for viewing only,
   * adding and editing comments will be unavailable. The default value is `true`.
   */
  comments?: boolean;
  /** Specifies whether to display or hide the additional action buttons in the upper part of the editor window header next to the logo (`false`)
   * or in the toolbar (`true`), making the header more compact. The default value is `false`.
   */
  compactHeader?: boolean;
  /** Specifies whether the top toolbar type displayed is full (`false`) or compact (`true`).
   * The default value is `false`. Starting from version 8.3, this setting is also available for the viewer.
   * The default value for the view mode is `true`.
   */
  compactToolbar?: boolean;
  /** Specifies whether to use functionality only compatible with the OOXML format.
   * For example, do not use comments on the entire document. The default value is `false`.
   */
  compatibleFeatures?: boolean;
  /** Specifies whether to add the request for the file force saving to the callback handler
   * when saving the document within the document editing service (e.g. clicking the "Save" button, etc.).
   * The default value is `false`.
   */
  forcesave?: boolean;
  /** Specifies whether to display or hide the "Help" menu button. The default value is `true`. */
  help?: boolean;
  /** Specifies whether to display or hide the right menu on first loading. The default value is `true`. */
  hideRightMenu?: boolean;
  /** Specifies whether to display or hide the editor rulers.
   * This parameter is available for the document and presentation editors.
   * The default value is `false` for the document editor and `true` for presentations.
   */
  hideRulers?: boolean;
  /** The mode of embedding editors into the web page.
   * The "embed" value disables scrolling to the editor frame when it is loaded as the focus is not captured.
   */
  integrationMode?: string;
  /** Specifies whether to automatically run macros when the editor opens. The default value is `true`.
   * Starting version 9.0.3, the `false` value completely disables macros — they cannot be run, added, or edited.
   * The "Macros" button is also hidden from the "View" tab.
   */
  macros?: boolean;
  /** The macros run mode when autostart is enabled. Can take the following values: "disable" - don't run macros at all,
   * "warn" - warn about macros and ask permission to run them,
   * "enable" - run all macros automatically. The default value is "warn".
   */
  macrosMode?: string;
  /** The hint that describes the event after mentions in a comment.
   * If `true`, a hint indicates that the user will receive a notification and access to the document.
   * If `false`, a hint indicates that the user will receive only a notification of the mention.
   * The default value is `true`.
   */
  mentionShare?: boolean;
  /** Specifies whether to open the mobile document editor in the view/edit mode on launch.
   * The default value is `true`.
   */
  mobileForceView?: boolean;
  /** Specifies whether the plugins will be launched and available. The default value is `true`. */
  plugins?: boolean;
  /** Specifies whether to display (`false`) or hide (`true`) the document title on the top toolbar.
   * The default value is `false`.
   */
  toolbarHideFileName?: boolean;
  /** Specifies whether to distinctly display (`false`) or only highlight (`true`) the top toolbar tabs in toolbar.
   * The default value is `false`.
   */
  toolbarNoTabs?: boolean;
  /** The editor theme settings. It can be set in two ways: "theme id" - the user sets the theme parameter by its id
   * ("theme-light", "theme-classic-light", "theme-dark", "theme-contrast-dark", "theme-white", "theme-night"),
   * "default theme" - the default dark or light theme value will be set ("default-dark", "default-light").
   * The default light theme is "theme-classic-light".
   */
  uiTheme?: string;
  /** The measurement units used on the ruler and in dialog boxes. Can take the following values: "cm" - centimeters, "pt" - points,
   * "inch" - inches. The default value is centimeters ("cm").
   */
  unit?: string;
  /** The document display zoom value measured in percent. Can take values larger than "0".
   * For text documents and presentations it is possible to set this parameter to "-1" (fitting the document to page option)
   * or to "-2" (fitting the document page width to the editor page).
   * The default value is "100".
   */
  zoom?: number;
};

/**
 * The frame filter criteria.
 */
export type TFrameFilter = {
  /** The number of files and folders displayed on one page. */
  count?: string;
  /** The target folder. */
  folder?: string;
  /** The page number to start from. */
  page?: string;
  /** The query used to search for files and folders. */
  search?: string;
  /** The parameter used to sort the list of files and folders. */
  sortBy?: TFilterSortBy;
  /** The sort direction for the list of files and folders. */
  sortOrder?: TFilterSortOrder;
  /** Specifies whether to exclude subfolders when searching for files. */
  withSubfolders?: boolean;
};

/**
 * The frame event handlers.
 */
export type TFrameEvents = {
  /** The function called when SDK is initialized with an error. This error is returned during the initialization. */
  onAppError?: null | ((e?: Event | object | string) => void);
  /** The function called when SDK is initialized successfully. */
  onAppReady?: null | ((e?: Event | object | string) => void);
  /** The function called upon successful authorization. */
  onAuthSuccess?: null | ((e?: Event | object | string) => void);
  /** The function called in the "room-selector" and "file-selector" modes when the room or file selector is closed or the selection is canceled. */
  onCloseCallback?: null | ((e?: Event | object | string) => void);
  /** The function called when the frame is loaded. */
  onContentReady?: null | ((e?: Event | object | string) => void);
  /** The function called when download events are fired from the manager. The function returns a link to the download object. This event is triggered only when the "downloadToEvent" parameter is specified in the config. */
  onDownload?: null | ((e?: Event | object | string) => void);
  /** The function called when the document editor is closed. */
  onEditorCloseCallback?: null | ((e?: Event | object | string) => void);
  /** The function called when trying to initialize the frame in a room or folder that is inaccessible or has been deleted. */
  onNoAccess?: null | ((e?: Event | object | string) => void);
  /** The function called when trying to initialize the frame in a room or folder that is not found. */
  onNotFound?: null | ((e?: Event | object | string) => void);
  /** The function called in the "room-selector" and "file-selector" modes when a room or file is selected, returning information about the selected item. */
  onSelectCallback?: null | ((e?: Event | object | string) => void);
  /** The function called when logging out of the user account. */
  onSignOut?: null | ((e?: Event | object | string) => void);
  /** The function called when the document editor is opened for creating or editing documents, or filling out forms, from the context menu, modal windows, panels, or hotkeys. */
  onEditorOpen?: null | ((e?: Event | object | string) => void);
  /** The function called when a file is clicked in the list of files. */
  onFileManagerClick?: null | ((e?: Event | object | string) => void);
  /** The function called when a file is uploaded successfully. */
  onUploadSuccess?: null | ((e?: Event | object | string) => void);
  /** The function called when a file upload fails. */
  onUploadError?: null | ((e?: Event | object | string) => void);
  /** The function called when a file upload progress is updated. */
  onUploadProgress?: null | ((e?: Event | object | string) => void);
};

/**
 * The frame configuration.
 */
export type TFrameConfig = {
  /** Specifies whether to initialize the frame without showing a loading spinner. */
  noLoader?: boolean;
  /** The selector room type. */
  roomType?: string;
  /** The label for the selector accept button. */
  acceptButtonLabel?: string;
  /** The label for the selector cancel button. */
  cancelButtonLabel?: string;
  /** The HEX code to customize the selector button color. */
  buttonColor?: string;
  /** Specifies whether to check for the presence of CSP headers before initialization. */
  checkCSP?: boolean;
  /** The text to display when destroying the frame. It will be inserted into the `div` tag when the "destroyFrame" method is called. */
  destroyText?: string;
  /** Specifies whether to disable the "Actions" button in the manager interface. */
  disableActionButton?: boolean;
  /** Specifies whether to handle download links using the `onDownload` event instead of downloading directly. */
  downloadToEvent?: boolean;
  /** The parameters to customize editors. */
  editorCustomization?: TEditorCustomization | object;
  /** Specifies whether the "Open file location" button is displayed in the editor. */
  editorGoBack?: boolean | string;
  /** The editor mode display type. */
  editorType?: TEditorType;
  /** The callback functions for SDK events. */
  events?: TFrameEvents;
  /** The filter parameters that facilitate searching files and folders in the DocSpace manager. */
  filter?: TFrameFilter;
  /** The filter parameters that facilitate searching files in the selector mode. */
  filterParam?: string;
  /** The unique frame identifier used to refer to the SDK instance. */
  frameId: string;
  /** The iframe height measured in percentages or pixels. */
  height?: string;
  /** The unique instance identifier used in the SDK initialization modes. */
  id?: string | number | null;
  /** Specifies whether to display a button to show the info panel in the DocSpace manager. */
  infoPanelVisible?: boolean;
  /** Specifies whether to initialize the frame. */
  init?: boolean | null;
  /** The language of the DocSpace user interface specified with the four letter language code. */
  locale?: string | null;
  /** The SDK initialization mode. */
  mode: TFrameMode | string;
  /** The iframe name used for messaging at the SDK level. */
  name?: string;
  /** The authorization token for API requests. Used to open public rooms and files in public rooms. */
  requestToken?: string | null;
  /** The base path used for DocSpace navigation. By default, opens a list of rooms. */
  rootPath?: string;
  /** The filter type used in the selector views. */
  selectorType?: TSelectorType;
  /** Specifies whether the filter options are displayed in the DocSpace manager. */
  showFilter?: boolean;
  /** Specifies whether the interface header is displayed in the mobile view manager. */
  showHeader?: boolean;
  /** The display settings of the header banner. */
  showHeaderBanner?: TBannerDisplaying;
  /** Specifies whether the left menu is displayed in the DocSpace manager. */
  showMenu?: boolean;
  /** Specifies whether the "Cancel" button is displayed in the selector mode. */
  showSelectorCancel?: boolean;
  /** Specifies whether the interface header is displayed in the selector mode. */
  showSelectorHeader?: boolean;
  /** Specifies whether to display the "Manage displayed columns" button for configuring the table columns in the list view. */
  showSettings?: boolean;
  /** Specifies whether the "Sign out" button is displayed. */
  showSignOut?: boolean;
  /** Specifies whether the title of the current section/room/folder is displayed in the DocSpace manager. */
  showTitle?: boolean;
  /** The source URL to the iframe used to generate links. */
  src: string;
  /** The UI theme settings. */
  theme?: TTheme | string;
  /** The platform type used by the browser and affects the parameters of the inserted object. */
  type?: TEditorType;
  /** The default view mode - the way items are arranged in the DocSpace manager. */
  viewAs?: TManagerViewMode;
  /** The comma-separated string of table column names that are displayed in the table view mode. */
  viewTableColumns?: string;
  /** Specifies whether the frame is in the loading state. */
  waiting?: boolean;
  /** The iframe width measured in percentages or pixels. */
  width?: string;
  /** Specifies whether to show breadcrumb navigation in the selector mode. */
  withBreadCrumbs?: boolean;
  /** Specifies whether to display "Search" in the selector mode. */
  withSearch?: boolean;
  /** Specifies whether to display a subtitle with additional comments or descriptions for the current directory. */
  withSubtitle?: boolean;
  /** The link main text displayed in the uploader mode. */
  linkMainText?: string;
  /** The link secondary text displayed in the uploader mode. */
  linkSecondaryText?: string;
  /** The extensions text displayed in the uploader mode. */
  extensionsText?: string;
  /** The accepted file extensions for the uploader mode. */
  acceptExtensions?: string;
};

/** The template literal type for message types. */
export type TMessageTypes = `${MessageTypes}`;

/**
 * The message data structure.
 */
export type TMessageData = {
  /** The command data payload. */
  commandData?: object;
  /** The name of the command to execute in the DocSpace frame. */
  commandName: string;
  /** The event return data. */
  eventReturnData?: TEventReturnData;
  /** The error information. */
  error?: {
    /** The error message. */
    message: string;
    /** The error code. */
    code?: number;
  };
  /** The frame unique identifier. */
  frameId: string;
  /** The method return data. */
  methodReturnData?: object;
  /** The message type. */
  type: TMessageTypes;
};

/**
 * The event return data structure.
 */
export type TEventReturnData = {
  /** The event data payload. */
  data?: object;
  /** The event name. */
  event: string;
};

/**
 * The task object structure.
 */
export type TTask = {
  /** The task data payload. */
  data?: object | null;
  /** The method name. */
  methodName: string;
  /** The task type. */
  type: string;
};
