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

import { SDK } from "./sdk";
import { SDKError, SDKErrorCode } from "./errors";

if (typeof window !== "undefined") {
  window.DocSpace = window.DocSpace || {};
  window.DocSpace.SDK = window.DocSpace.SDK || new SDK();
}

export { SDKError, SDKErrorCode };
export default SDK;
export { SDKInstance } from "./instance";
export {
  SDKMode,
  SelectorFilterType,
  EditorType,
  ManagerViewMode,
  Theme,
  FilterSortOrder,
  FilterSortBy,
  HeaderBannerDisplaying,
} from "./enums";
export type {
  TGetExternalDataRequest,
  TSetExternalDataPayload,
  TFrameConfig,
  TFrameEvents,
  TFrameFilter,
  TEditorCustomization,
  TCreateRoomOptions,
  TFormsSection,
  TCustomActionsConfig,
  TCustomContextMenuAction,
  TEntityBase,
  TFileInfo,
  TFolderInfo,
  TRoomInfo,
  TUserInfo,
  TListResponse,
  TFilesResponse,
  TRoomsResponse,
  THashSettings,
  TPathParts,
  TCreatedBy,
  TLogo,
  TFrameMode,
  TManagerViewMode,
  TTheme,
  TEditorType,
  TSelectorType,
  TBannerDisplaying,
  TFilterSortBy,
  TFilterSortOrder,
} from "./types";
