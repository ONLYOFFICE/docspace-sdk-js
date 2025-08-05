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

import {
  SDKMode,
  SelectorFilterType,
  EditorType,
  ManagerViewMode,
  Theme,
  FilterSortOrder,
  HeaderBannerDisplaying,
  FilterSortBy,
  MessageTypes,
} from "../enums";
import { SDKInstance } from "../instance";

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
/** Template literal type representing frame mode based on `SDKMode`. */
export type TFrameMode = `${SDKMode}`;

/** Template literal type for selector filters .*/
export type TSelectorType = `${SelectorFilterType}`;

/** Template literal type based on `EditorType` enum. */
export type TEditorType = `${EditorType}`;

/** Template literal type representing manager view mode. */
export type TManagerViewMode = `${ManagerViewMode}`;

/** Template literal type representing theme options. */
export type TTheme = `${Theme}`;

/** Template literal type representing filter sort order. */
export type TFilterSortOrder = `${FilterSortOrder}`;

/** Template literal type for header banner display options. */
export type TBannerDisplaying = `${HeaderBannerDisplaying}`;

/** Template literal type representing filter sort options. */
export type TFilterSortBy = `${FilterSortBy}`;

/**
 * Editor customization configuration
 */
export type TEditorCustomization = {
  /** Anonymous access configuration */
  anonymous?: {
    /** Whether to request anonymous access */
    request?: boolean;
    /** Label for anonymous access */
    label?: string;
  };
  /** Enable/disable automatic saving */
  autosave?: boolean;
  /** Enable/disable comments */
  comments?: boolean;
  /** Enable/disable compact header */
  compactHeader?: boolean;
  /** Enable/disable compact toolbar */
  compactToolbar?: boolean;
  /** Enable/disable compatibility features */
  compatibleFeatures?: boolean;
  /** Enable/disable force save */
  forcesave?: boolean;
  /** Show/hide help */
  help?: boolean;
  /** Show/hide right menu */
  hideRightMenu?: boolean;
  /** Show/hide rulers */
  hideRulers?: boolean;
  /** Integration mode setting */
  integrationMode?: string;
  /** Enable/disable macros */
  macros?: boolean;
  /** Macros mode setting */
  macrosMode?: string;
  /** Enable/disable mention and share */
  mentionShare?: boolean;
  /** Force mobile view */
  mobileForceView?: boolean;
  /** Enable/disable plugins */
  plugins?: boolean;
  /** Hide/show filename in toolbar */
  toolbarHideFileName?: boolean;
  /** Hide/show tabs in toolbar */
  toolbarNoTabs?: boolean;
  /** UI theme setting */
  uiTheme?: string;
  /** Measurement unit */
  unit?: string;
  /** Zoom level */
  zoom?: number;
};

/**
 * Frame filter criteria
 */
export type TFrameFilter = {
  /** Number of items to retrieve */
  count?: string;
  /** Target folder */
  folder?: string;
  /** Page number */
  page?: string;
  /** Search term */
  search?: string;
  /** Sort field */
  sortBy?: TFilterSortBy;
  /** Sort direction */
  sortOrder?: TFilterSortOrder;
  /** Include subfolders */
  withSubfolders?: boolean;
};

/**
 * Frame event handlers
 */
export type TFrameEvents = {
  /** Application error handler */
  onAppError?: null | ((e?: Event | object | string) => void);
  /** Application ready handler */
  onAppReady?: null | ((e?: Event | object | string) => void);
  /** Authentication success handler */
  onAuthSuccess?: null | ((e?: Event | object | string) => void);
  /** Close action handler */
  onCloseCallback?: null | ((e?: Event | object | string) => void);
  /** Content ready handler */
  onContentReady?: null | ((e?: Event | object | string) => void);
  /** Download action handler */
  onDownload?: null | ((e?: Event | object | string) => void);
  /** Editor close handler */
  onEditorCloseCallback?: null | ((e?: Event | object | string) => void);
  /** Access denied handler */
  onNoAccess?: null | ((e?: Event | object | string) => void);
  /** Resource not found handler */
  onNotFound?: null | ((e?: Event | object | string) => void);
  /** Selection handler */
  onSelectCallback?: null | ((e?: Event | object | string) => void);
  /** Sign-out handler */
  onSignOut?: null | ((e?: Event | object | string) => void);
  /** Editor open handler */
  onEditorOpen?: null | ((e?: Event | object | string) => void);
};

/**
 * Frame configuration
 */
export type TFrameConfig = {
  /** Whether to disable loader */
  noLoader?: boolean;
  /** Selector room type */
  roomType?: string;
  /** Label for selector accept button */
  acceptButtonLabel?: string;
  /** Label for selector cancel button */
  cancelButtonLabel?: string;
  /** Button color */
  buttonColor?: string;
  /** Whether to check Content Security Policy */
  checkCSP?: boolean;
  /** Destroy message text */
  destroyText?: string;
  /** Whether to disable action button */
  disableActionButton?: boolean;
  /** Whether to enable download to event */
  downloadToEvent?: boolean;
  /** Editor customization options */
  editorCustomization?: TEditorCustomization | object;
  /** Whether to enable editor back navigation */
  editorGoBack?: boolean | string;
  /** Editor type */
  editorType?: TEditorType;
  /** Event handlers */
  events?: TFrameEvents;
  /** Filter settings */
  filter?: TFrameFilter;
  /** Additional filter parameter */
  filterParam?: string;
  /** Frame identifier */
  frameId: string;
  /** Frame height */
  height?: string;
  /** Optional identifier */
  id?: string | number | null;
  /** Whether to show info panel */
  infoPanelVisible?: boolean;
  /** Whether to initialize frame */
  init?: boolean | null;
  /** Localization setting */
  locale?: string | null;
  /** Frame operation mode */
  mode: TFrameMode | string;
  /** Frame name */
  name?: string;
  /** Authentication token */
  requestToken?: string | null;
  /** Root path for resources */
  rootPath?: string;
  /** Selector type */
  selectorType?: TSelectorType;
  /** Whether to show filter UI */
  showFilter?: boolean;
  /** Whether to show header */
  showHeader?: boolean;
  /** Header banner display */
  showHeaderBanner?: TBannerDisplaying;
  /** Whether to show menu */
  showMenu?: boolean;
  /** Whether to show selector cancel */
  showSelectorCancel?: boolean;
  /** Whether to show selector header */
  showSelectorHeader?: boolean;
  /** Whether to show settings */
  showSettings?: boolean;
  /** Whether to show sign out option */
  showSignOut?: boolean;
  /** Whether to show title */
  showTitle?: boolean;
  /** Content source URL */
  src: string;
  /** UI theme */
  theme?: TTheme | string;
  /** Editor type */
  type?: TEditorType;
  /** Manager view mode */
  viewAs?: TManagerViewMode;
  /** Table columns to display */
  viewTableColumns?: string;
  /** Whether to enable loading state */
  waiting?: boolean;
  /** Frame width */
  width?: string;
  /** Whether to show breadcrumbs */
  withBreadCrumbs?: boolean;
  /** Whether to enable search */
  withSearch?: boolean;
  /** Whether to show subtitle */
  withSubtitle?: boolean;
};

/** Template literal type for message types */
export type TMessageTypes = `${MessageTypes}`;

/**
 * Message data structure
 */
export type TMessageData = {
  /** Command data payload */
  commandData?: object;
  /** Command name */
  commandName: string;
  /** Event return data */
  eventReturnData?: TEventReturnData;
  /** Error information */
  error?: {
    /** Error message */
    message: string;
    /** Error code */
    code?: number;
  };
  /** Frame identifier */
  frameId: string;
  /** Method return data */
  methodReturnData?: object;
  /** Message type */
  type: TMessageTypes;
};

/**
 * Event return data structure
 */
export type TEventReturnData = {
  /** Event data payload */
  data?: object;
  /** Event name */
  event: string;
};

/**
 * Task object structure
 */
export type TTask = {
  /** Task data payload */
  data?: object | null;
  /** Method name */
  methodName: string;
  /** Task type */
  type: string;
};
