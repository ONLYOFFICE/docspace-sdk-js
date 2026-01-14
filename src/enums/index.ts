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

/**
 * The available modes for initializing the SDK.
 * Defines the context in which the SDK operates.
 */
export enum SDKMode {
  /** Displays a list of entities based on the specified `rootPath`. Supports creating and managing rooms, folders, and files. */
  Manager = "manager",
  /** Opens the document editor for the file specified by its `id` parameter. */
  Editor = "editor",
  /** Opens the document viewer for the file specified by its `id` parameter. */
  Viewer = "viewer",
  /** Opens the room selector for selecting a room from the available list. */
  RoomSelector = "room-selector",
  /** Opens the file selector for selecting a file from the available list. */
  FileSelector = "file-selector",
  /** Displays a blank page with a loader and provides access to system methods. */
  System = "system",
  /** Displays a public room that provides access to view, edit, comment on, and review documents without registration. */
  PublicRoom = "public-room",
}

/**
 * The filter type used in the selector views.
 */
export const enum SelectorFilterType {
  /** Shows all available items. */
  All = "all",
  /** Shows only rooms. */
  RoomsOnly = "roomsOnly",
  /** Shows only user folders. */
  UserOnly = "userFolderOnly",
}

/**
 * The available types of editor interface.
 */
export const enum EditorType {
  /** The desktop editor optimized to access the document from a desktop or laptop computer. */
  Desktop = "desktop",
  /** The embedded editor specifically formed to be easily embedded into a web page. */
  Embedded = "embedded",
  /** The mobile editor optimized to access the document from a tablet or a smartphone. */
  Mobile = "mobile",
}

/**
 * The view modes available in the manager.
 */
export const enum ManagerViewMode {
  /** Displays items in a vertical list, showing details for each entry in a row. */
  Row = "row",
  /** Displays items in a table layout with columns for structured comparison. */
  Table = "table",
  /** Displays items as tiles, emphasizing visual previews and key information. */
  Tile = "tile",
}

/**
 * The available application themes.
 */
export const enum Theme {
  /** The light/base theme. */
  Base = "Base",
  /** The dark mode theme. */
  Dark = "Dark",
  /** Follows the system UI theme. */
  System = "System",
}

/**
 * The item sorting order.
 */
export const enum FilterSortOrder {
  /** Ascending order: items sorted from smallest to largest, A–Z, etc. */
  Ascending = "ascending",
  /** Descending order: items sorted from largest to smallest, Z–A, etc. */
  Descending = "descending",
}

/**
 * The criteria for filtering and sorting items.
 */
export const enum FilterSortBy {
  /** Sorts items by author name. */
  Author = "Author",
  /** Sorts items by creation date. */
  CreationDate = "DateAndTimeCreation",
  /** Sorts items by the last opened date. */
  LastOpened = "LastOpened",
  /** Sorts items by modification date. */
  ModifiedDate = "DateAndTime",
  /** Sorts items by name. */
  Name = "AZ",
  /** Sorts items by room. */
  Room = "Room",
  /** Sorts items by room type. */
  RoomType = "roomType",
  /** Sorts items by size. */
  Size = "Size",
  /** Sorts items by tags. */
  Tags = "Tags",
  /** Sorts items by type. */
  Type = "Type",
  /** Sorts items by used space. */
  UsedSpace = "usedspace",
}

/**
 * The display settings of the header banner.
 */
export const enum HeaderBannerDisplaying {
  /** Displays all header banners. */
  All = "all",
  /** Displays only informational header banners. */
  Info = "info",
  /** Does not display any header banners. */
  None = "none",
}

/**
 * Available instance methods in the SDK for file management, user information, and settings.
 */
export const enum InstanceMethods {
  /** Adds the specified tags to the room with the specified ID. */
  AddTagsToRoom = "addTagsToRoom",
  /** Creates a new file with the specified parameters. */
  CreateFile = "createFile",
  /** Creates a new folder with the specified parameters. */
  CreateFolder = "createFolder",
  /** Generates the hash string based on the specified hash settings. */
  CreateHash = "createHash",
  /** Creates a new room with the specified parameters. */
  CreateRoom = "createRoom",
  /** Creates a new tag with the specified name. */
  CreateTag = "createTag",
  /** Returns the information about all files in the SDK frame. */
  GetFiles = "getFiles",
  /** Returns the information about the current directory opened in the SDK frame. */
  GetFolderInfo = "getFolderInfo",
  /** Returns the information about all the folders in the SDK frame. */
  GetFolders = "getFolders",
  /** Returns the DocSpace hash settings for generating a password hash. */
  GetHashSettings = "getHashSettings",
  /** Returns the information about all files and folders in the SDK frame. */
  GetList = "getList",
  /** Returns the information about rooms according to the specified filter parameters. */
  GetRooms = "getRooms",
  /** Returns the information about the selected elements in the SDK frame. */
  GetSelection = "getSelection",
  /** Returns the information about the current DocSpace user or null if there are no authorized users. */
  GetUserInfo = "getUserInfo",
  /** Logs in to the DocSpace account using the specified email and password hash. */
  Login = "login",
  /** Logs out from the DocSpace account of the current user. */
  Logout = "logout",
  /** Opens the DocSpace modal window of the specified type. */
  OpenModal = "openModal",
  /** Removes the specified tags from the room with the specified ID. */
  RemoveTagsFromRoom = "removeTagsFromRoom",
  /** Sets the specified config for the current SDK entity. */
  SetConfig = "setConfig",
  /** Sets the display of entity lists according to the specified type. */
  SetListView = "setListView",
  /** Executes the specified callback within the editor context. */
  ExecuteInEditor = "executeInEditor",
}

/**
 * The types of messages exchanged between SDK components and the host application.
 */
export const enum MessageTypes {
  /** The message sent when a method returns a result. */
  OnMethodReturn = "onMethodReturn",
  /** The message sent when an event occurs. */
  OnEventReturn = "onEventReturn",
  /** The message sent when a command is called. */
  OnCallCommand = "onCallCommand",
  /** The message sent when an error occurs. */
  Error = "error",
}
