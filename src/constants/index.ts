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
 * Default configuration object for initializing and embedding a DocSpace frame.
 * 
 * @type {TFrameConfig}
 */
export const defaultConfig: TFrameConfig = {
  /** Source URL for the iframe. */
  src: "",
  /** Base path used for DocSpace navigation. */
  rootPath: "/rooms/shared/",
  /** Authorization token for API requests. */
  requestToken: null,
  /** Width of the iframe element. */
  width: "100%",
  /** Height of the iframe element. */
  height: "100%",
  /** Name of the iframe element. */
  name: FRAME_NAME,
  /** Type of editor to initialize. */
  type: EditorType.Desktop,
  /** Unique frame identifier. */
  frameId: "ds-frame",
  /** SDK mode to use for initialization. */
  mode: SDKMode.Manager,
  /** Unique identifier for the instance. */
  id: null,
  /** Language or locale (e.g., "en", "ru"). */
  locale: null,
  /** Theme of the interface (light, dark, or system default). */
  theme: Theme.System,
  /** Type of editor interface. */
  editorType: EditorType.Desktop,
  /** Whether to enable "Go back" navigation inside the editor. */
  editorGoBack: true,
  /** Filter type used in selector views. */
  selectorType: SelectorFilterType.All,
  /** Whether to show the cancel button in selector mode. */
  showSelectorCancel: false,
  /** Whether to show the header in selector mode. */
  showSelectorHeader: false,
  /** Whether to show the main header. */
  showHeader: false,
  /** Controls display of the header banner. */
  showHeaderBanner: HeaderBannerDisplaying.None,
  /** Whether to display the document or folder title. */
  showTitle: true,
  /** Whether to display the top menu. */
  showMenu: false,
  /** Whether to display filtering options. */
  showFilter: false,
  /** Whether to display the sign-out button. */
  showSignOut: true,
  /** Text to display when destroying the frame. */
  destroyText: "",
  /** Default view mode (table or row view). */
  viewAs: ManagerViewMode.Row,
  /** Comma-separated string of table columns to display. */
  viewTableColumns: "Index, Name, Size, Type, Tags",
  /** Whether to check CSP settings before initializing. */
  checkCSP: true,
  /** Whether to disable the main action button. */
  disableActionButton: false,
  /** Whether to show the settings button. */
  showSettings: false,
  /** Whether the frame is in a loading state. */
  waiting: false,
  /** Whether to initialize the frame without showing a loading spinner. */
  noLoader: true,
  /** Whether to enable the search bar. */
  withSearch: true,
  /** Whether to show breadcrumb navigation. */
  withBreadCrumbs: true,
  /** Whether to display a subtitle. */
  withSubtitle: true,
  /** Default filter parameter to apply (e.g., "ALL", "FAVORITES"). */
  filterParam: "ALL",
  /** Hex code for customizing the button color. */
  buttonColor: "#5299E0",
  /** Whether to make the info panel visible by default. */
  infoPanelVisible: true,
  /** Whether to trigger an event instead of downloading directly. */
  downloadToEvent: false,
  /** Filter configuration parameters. */
  filter: {
    /** Number of items per page. */
    count: "100",
    /** Page number to start from. */
    page: "1",
    /** Sort direction for the list. */
    sortOrder: FilterSortOrder.Descending,
    /** Property by which to sort the list. */
    sortBy: FilterSortBy.ModifiedDate,
    /** Search string. */
    search: "",
    /** Whether to include subfolders in results. */
    withSubfolders: false,
  },
  /** Customization options specific to the embedded editor. */
  editorCustomization: {},
  /** Callback functions for SDK events. */
  events: {
    /** Triggered when an item is selected by the user. */
    onSelectCallback: null,
    /** Triggered when the frame is closed manually. */
    onCloseCallback: null,
    /** Triggered when the frame is fully initialized. */
    onAppReady: null,
    /** Triggered when an error occurs inside the app. */
    onAppError: null,
    /** Triggered when the editor is closed. */
    onEditorCloseCallback: null,
    /** Triggered when the authentication is successfull. */
    onAuthSuccess: null,
    /** Triggered when user clicks “Sign Out”. */
    onSignOut: null,
    /** Triggered when user downloads a file. */
    onDownload: null,
    /** Triggered when there is no user access. */
    onNoAccess: null,
    /** Triggered when frame is not found. */
    onNotFound: null,
    /** Triggered when content is ready. */
    onContentReady: null,
    /** Triggered after the editor is opened. */
    onEditorOpen: null,
    onFileManagerClick: null
  },
} as const;

/** Error message displayed when the current domain is not included in the CSP settings. */
export const cspErrorText =
  "The current domain is not set in the Content Security Policy (CSP) settings." as const;

/** Error message displayed when the message bus fails to connect with the embedded frame. */
export const connectErrorText = "Message bus is not connected with frame" as const;
