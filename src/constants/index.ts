/*
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

export const CSPApiUrl = "/api/2.0/security/csp";

export const FRAME_NAME = "frameDocSpace";

export const defaultConfig: TFrameConfig = {
  src: "",
  rootPath: "/rooms/shared/",
  requestToken: null,
  width: "100%",
  height: "100%",
  name: FRAME_NAME,
  type: EditorType.Desktop,
  frameId: "ds-frame",
  mode: SDKMode.Manager,
  id: null,
  locale: null,
  theme: Theme.System,
  editorType: EditorType.Desktop,
  editorGoBack: true,
  selectorType: SelectorFilterType.All,
  showSelectorCancel: false,
  showSelectorHeader: false,
  showHeader: false,
  showHeaderBanner: HeaderBannerDisplaying.None,
  showTitle: true,
  showMenu: false,
  showFilter: false,
  showSignOut: true,
  destroyText: "",
  viewAs: ManagerViewMode.Row,
  viewTableColumns: "Index,Name,Size,Type,Tags",
  checkCSP: true,
  disableActionButton: false,
  showSettings: false,
  waiting: false,
  withSearch: true,
  withBreadCrumbs: true,
  withSubtitle: true,
  filterParam: "ALL",
  buttonColor: "#5299E0",
  infoPanelVisible: true,
  downloadToEvent: false,
  filter: {
    count: "100",
    page: "1",
    sortOrder: FilterSortOrder.Descending,
    sortBy: FilterSortBy.ModifiedDate,
    search: "",
    withSubfolders: false,
  },
  editorCustomization: {},
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
  },
};

export const cspErrorText =
  "The current domain is not set in the Content Security Policy (CSP) settings.";

export const connectErrorText = "Message bus is not connected with frame";
