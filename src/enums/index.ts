export const enum SDKMode {
  Manager = "manager",
  Editor = "editor",
  Viewer = "viewer",
  RoomSelector = "room-selector",
  FileSelector = "file-selector",
  System = "system",
}

export const enum SelectorFilterType {
  All = "all",
  RoomsOnly = "roomsOnly",
  UserOnly = "userFolderOnly",
}

export const enum EditorType {
  Desktop = "desktop",
  Embedded = "embedded",
  Mobile = "mobile",
}

export const enum ManagerViewMode {
  Row = "row",
  Table = "table",
  Tile = "tile",
}

export const enum Theme {
  Base = "Base",
  Dark = "Dark",
  System = "System",
}

export const enum FilterSortOrder {
  Ascending = "ascending",
  Descending = "descending",
}

export const enum FilterSortBy {
  Author = "Author",
  CreationDate = "DateAndTimeCreation",
  LastOpened = "LastOpened",
  ModifiedDate = "DateAndTime",
  Name = "AZ",
  Room = "Room",
  RoomType = "roomType",
  Size = "Size",
  Tags = "Tags",
  Type = "Type",
  UsedSpace = "usedspace",
}

export const enum HeaderBannerDisplaying {
  All = "all",
  Info = "info",
  None = "none",
}

export const enum InstanceMethods {
  AddTagsToRoom = "addTagsToRoom",
  CreateFile = "createFile",
  CreateFolder = "createFolder",
  CreateHash = "createHash",
  CreateRoom = "createRoom",
  CreateTag = "createTag",
  GetFiles = "getFiles",
  GetFolderInfo = "getFolderInfo",
  GetFolders = "getFolders",
  GetHashSettings = "getHashSettings",
  GetList = "getList",
  GetRooms = "getRooms",
  GetSelection = "getSelection",
  GetUserInfo = "getUserInfo",
  Login = "login",
  Logout = "logout",
  OpenModal = "openModal",
  RemoveTagsFromRoom = "removeTagsFromRoom",
  SetConfig = "setConfig",
  SetListView = "setListView",
}

export const enum MessageTypes {
  OnMethodReturn = "onMethodReturn",
  OnEventReturn = "onEventReturn",
  OnCallCommand = "onCallCommand",
  Error = "error",
}
