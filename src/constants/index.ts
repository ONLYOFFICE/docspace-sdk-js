/**
 * (c) Copyright Ascensio System SIA 2024
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

import { TFrameConfig } from "../types";
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

/** The API endpoint for Content Security Policy (CSP) settings */
export const CSPApiUrl = "/api/2.0/security/csp" as const;

/** The default name for the DocSpace iframe element */
export const FRAME_NAME = "frameDocSpace" as const;

/**
 * Default configuration for the DocSpace frame
 * 
 * @type {TFrameConfig}
 */
export const defaultConfig: TFrameConfig = {
  /** Source URL for the frame */
  src: "",
  /** Root path for navigation */
  rootPath: "/rooms/shared/",
  /** Authentication token */
  requestToken: null,
  /** Frame width */
  width: "100%",
  /** Frame height */
  height: "100%",
  /** Frame name */
  name: FRAME_NAME,
  /** Editor type setting */
  type: EditorType.Desktop,
  /** Unique identifier for the frame */
  frameId: "ds-frame",
  /** SDK operation mode */
  mode: SDKMode.Manager,
  /** Unique identifier */
  id: null,
  /** Language/locale setting */
  locale: null,
  /** UI theme setting */
  theme: Theme.System,
  /** Type of editor to use */
  editorType: EditorType.Desktop,
  /** Enable/disable editor back navigation */
  editorGoBack: true,
  /** Type of selector filter */
  selectorType: SelectorFilterType.All,
  /** Show/hide selector cancel button */
  showSelectorCancel: false,
  /** Show/hide selector header */
  showSelectorHeader: false,
  /** Show/hide main header */
  showHeader: false,
  /** Header banner display setting */
  showHeaderBanner: HeaderBannerDisplaying.None,
  /** Show/hide title */
  showTitle: true,
  /** Show/hide menu */
  showMenu: false,
  /** Show/hide filter options */
  showFilter: false,
  /** Show/hide sign out option */
  showSignOut: true,
  /** Text to display when destroying */
  destroyText: "",
  /** View mode setting */
  viewAs: ManagerViewMode.Row,
  /** Columns to display in table view */
  viewTableColumns: "Index,Name,Size,Type,Tags",
  /** Enable/disable CSP checking */
  checkCSP: true,
  /** Enable/disable action button */
  disableActionButton: false,
  /** Show/hide settings */
  showSettings: false,
  /** Loading state indicator */
  waiting: false,
  /** Enable/disable search functionality */
  withSearch: true,
  /** Show/hide breadcrumb navigation */
  withBreadCrumbs: true,
  /** Show/hide subtitle */
  withSubtitle: true,
  /** Default filter parameter */
  filterParam: "ALL",
  /** Custom button color */
  buttonColor: "#5299E0",
  /** Show/hide info panel */
  infoPanelVisible: true,
  /** Enable/disable download event handling */
  downloadToEvent: false,
  /** Filter configuration */
  filter: {
    count: "100",
    page: "1",
    sortOrder: FilterSortOrder.Descending,
    sortBy: FilterSortBy.ModifiedDate,
    search: "",
    withSubfolders: false,
  },
  /** Editor customization options */
  editorCustomization: {},
  /** Event callback configuration */
  events: {
    onSelectCallback: null,
    onCloseCallback: null,
    onAppReady: null,
    onAppError: null,
    onEditorCloseCallback: null,
    onAuthSuccess: null,
    onSignOut: null,
    onDownload: null,
    onNoAccess: null,
    onNotFound: null,
    onContentReady: null,
    onEditorOpen: null,
  },
} as const;

/** Error message displayed when the current domain is not included in CSP settings */
export const cspErrorText =
  "The current domain is not set in the Content Security Policy (CSP) settings." as const;

/** Error message displayed when the message bus fails to connect with the frame */
export const connectErrorText = "Message bus is not connected with frame" as const;
