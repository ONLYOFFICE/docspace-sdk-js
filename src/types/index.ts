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
import SDKInstance from "../instance";

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

export type TFrameMode = `${SDKMode}`;

export type TSelectorType = `${SelectorFilterType}`;

export type TEditorType = `${EditorType}`;

export type TManagerViewMode = `${ManagerViewMode}`;

export type TTheme = `${Theme}`;

export type TFilterSortOrder = `${FilterSortOrder}`;

export type TBannerDisplaying = `${HeaderBannerDisplaying}`;

export type TFilterSortBy = `${FilterSortBy}`;

export type TEditorCustomization = {
  anonymous?: {
    request?: boolean;
    label?: string;
  };
  autosave?: boolean;
  comments?: boolean;
  compactHeader?: boolean;
  compactToolbar?: boolean;
  compatibleFeatures?: boolean;
  forcesave?: boolean;
  help?: boolean;
  hideRightMenu?: boolean;
  hideRulers?: boolean;
  integrationMode?: string;
  macros?: boolean;
  macrosMode?: string;
  mentionShare?: boolean;
  mobileForceView?: boolean;
  plugins?: boolean;
  toolbarHideFileName?: boolean;
  toolbarNoTabs?: boolean;
  uiTheme?: string;
  unit?: string;
  zoom?: number;
};

export type TFrameFilter = {
  count?: string;
  folder?: string;
  page?: string;
  search?: string;
  sortBy?: TFilterSortBy;
  sortOrder?: TFilterSortOrder;
  withSubfolders?: boolean;
};

export type TFrameEvents = {
  onAppError?: null | ((e: Event | string) => void);
  onAppReady?: null | (() => void);
  onAuthSuccess?: null | (() => void);
  onCloseCallback?: null | ((e: Event) => void);
  onContentReady?: null | (() => void);
  onDownload?: null | ((e: Event | string) => void);
  onEditorCloseCallback?: null | ((e: Event) => void);
  onNoAccess?: null | (() => void);
  onNotFound?: null | (() => void);
  onSelectCallback?: null | ((e: Event | object) => void);
  onSignOut?: null | (() => void);
};

export type TFrameConfig = {
  buttonColor?: string;
  checkCSP?: boolean;
  destroyText?: string;
  disableActionButton?: boolean;
  downloadToEvent?: boolean;
  editorCustomization?: TEditorCustomization | object;
  editorGoBack?: boolean | string;
  editorType?: TEditorType;
  events?: TFrameEvents;
  filter?: TFrameFilter;
  filterParam?: string;
  frameId: string;
  height?: string;
  id?: string | number | null;
  infoPanelVisible?: boolean;
  init?: boolean | null;
  locale?: string | null;
  mode: TFrameMode | string;
  name?: string;
  requestToken?: string | null;
  rootPath?: string;
  selectorType?: TSelectorType;
  showFilter?: boolean;
  showHeader?: boolean;
  showHeaderBanner?: TBannerDisplaying;
  showMenu?: boolean;
  showSelectorCancel?: boolean;
  showSelectorHeader?: boolean;
  showSettings?: boolean;
  showSignOut?: boolean;
  showTitle?: boolean;
  src: string;
  theme?: TTheme | string;
  type?: TEditorType;
  viewAs?: TManagerViewMode;
  viewTableColumns?: string;
  waiting?: boolean;
  width?: string;
  withBreadCrumbs?: boolean;
  withSearch?: boolean;
  withSubtitle?: boolean;
};

export type TMessageTypes = `${MessageTypes}`;

export type TMessageData = {
  commandData?: object;
  commandName: string;
  eventReturnData?: TEventReturnData;
  frameId: string;
  methodReturnData?: object;
  type: TMessageTypes;
};

export type TEventReturnData = {
  data?: object;
  event: string;
};

export type TTask = {
  data?: object | null;
  methodName: string;
  type: string;
};
