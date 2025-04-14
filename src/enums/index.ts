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

/**
 * Available modes in the SDK
 */
export enum SDKMode {
  /** Manager mode */
  Manager = "manager",
  /** Editor mode */
  Editor = "editor",
  /** Viewer mode */
  Viewer = "viewer",
  /** Room selector mode */
  RoomSelector = "room-selector",
  /** File selector mode */
  FileSelector = "file-selector",
  /** System mode */
  System = "system",
  /** Public room mode */
  PublicRoom = "public-room",
}

/**
 * Types of filters that can be applied to a selector
 */
export const enum SelectorFilterType {
  /** Show all items */
  All = "all",
  /** Show only rooms */
  RoomsOnly = "roomsOnly",
  /** Show only user folder */
  UserOnly = "userFolderOnly",
}

/**
 * Types of editors available
 */
export const enum EditorType {
  /** Desktop editor */
  Desktop = "desktop",
  /** Embedded editor */
  Embedded = "embedded",
  /** Mobile editor */
  Mobile = "mobile",
}

/**
 * View modes available in the manager
 */
export const enum ManagerViewMode {
  /** Row view */
  Row = "row",
  /** Table view */
  Table = "table",
  /** Tile view */
  Tile = "tile",
}

/**
 * Available application themes
 */
export const enum Theme {
  /** Base theme */
  Base = "Base",
  /** Dark theme */
  Dark = "Dark",
  /** System theme */
  System = "System",
}

/**
 * Sort order for filtering
 */
export const enum FilterSortOrder {
  /** Ascending order */
  Ascending = "ascending",
  /** Descending order */
  Descending = "descending",
}

/**
 * Criteria for filtering and sorting items
 */
export const enum FilterSortBy {
  /** Sort by author */
  Author = "Author",
  /** Sort by creation date */
  CreationDate = "DateAndTimeCreation",
  /** Sort by last opened date */
  LastOpened = "LastOpened",
  /** Sort by modification date */
  ModifiedDate = "DateAndTime",
  /** Sort by name */
  Name = "AZ",
  /** Sort by room */
  Room = "Room",
  /** Sort by room type */
  RoomType = "roomType",
  /** Sort by size */
  Size = "Size",
  /** Sort by tags */
  Tags = "Tags",
  /** Sort by type */
  Type = "Type",
  /** Sort by used space */
  UsedSpace = "usedspace",
}

/**
 * Header banner display options
 */
export const enum HeaderBannerDisplaying {
  /** Display all header banners */
  All = "all",
  /** Display only informational header banners */
  Info = "info",
  /** Do not display any header banners */
  None = "none",
}

/**
 * Available instance methods in the SDK for file management, user info, and settings
 */
export const enum InstanceMethods {
  /** Add tags to a room */
  AddTagsToRoom = "addTagsToRoom",
  /** Create a new file */
  CreateFile = "createFile",
  /** Create a new folder */
  CreateFolder = "createFolder",
  /** Create a hash */
  CreateHash = "createHash",
  /** Create a new room */
  CreateRoom = "createRoom",
  /** Create a new tag */
  CreateTag = "createTag",
  /** Get files list */
  GetFiles = "getFiles",
  /** Get folder information */
  GetFolderInfo = "getFolderInfo",
  /** Get folders list */
  GetFolders = "getFolders",
  /** Get hash settings */
  GetHashSettings = "getHashSettings",
  /** Get general list */
  GetList = "getList",
  /** Get rooms list */
  GetRooms = "getRooms",
  /** Get current selection */
  GetSelection = "getSelection",
  /** Get user information */
  GetUserInfo = "getUserInfo",
  /** Perform login */
  Login = "login",
  /** Perform logout */
  Logout = "logout",
  /** Open a modal */
  OpenModal = "openModal",
  /** Remove tags from a room */
  RemoveTagsFromRoom = "removeTagsFromRoom",
  /** Set configuration */
  SetConfig = "setConfig",
  /** Set list view */
  SetListView = "setListView",
  /** Execute callback inside editor context */
  ExecuteInEditor = "executeInEditor",
}

/**
 * Types of messages
 */
export const enum MessageTypes {
  /** Method return message */
  OnMethodReturn = "onMethodReturn",
  /** Event return message */
  OnEventReturn = "onEventReturn",
  /** Command call message */
  OnCallCommand = "onCallCommand",
  /** Error message */
  Error = "error",
}
