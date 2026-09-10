# ONLYOFFICE Apps Embed SDK

The ONLYOFFICE Apps Embed SDK lets developers integrate ONLYOFFICE Apps into web applications. Embed a full-featured file manager, document editor, room and file selectors, file uploader, forms gallery or AI chat — with just a few lines of code.

You can use it as an [npm package](#npm) for modern web applications or connect it via a [script tag](#script-tag) for a quick start. For React projects, there is also a ready-made [React component](https://api.onlyoffice.com/docspace/javascript-sdk/get-started/react-component/).

## Prerequisites

For the SDK to work, add the domain of your application to the allowlist of your ONLYOFFICE Apps workspace:

1. Open **Developer Tools → Embed SDK** in ONLYOFFICE Apps.
2. Under **Add the allowed domains for this workspace**, enter the address of your server's root directory.

## Getting Started

### npm

```bash
npm install @onlyoffice/docspace-sdk-js
```

```typescript
import { SDK } from "@onlyoffice/docspace-sdk-js";

const sdk = new SDK();

// Embed a file manager
const manager = sdk.initManager({
  frameId: "ds-frame",
  src: "https://portal.example.com",
  events: {
    onAppReady: () => console.log("ONLYOFFICE Apps is ready"),
    onAppError: (err) => console.error("Error:", err),
  },
});
```

The SDK provides both CommonJS and ES module builds, so it works with any modern bundler (Webpack, Vite, esbuild, etc.).

### Script tag

If you prefer not to use a package manager, include the *api.js* script directly from your ONLYOFFICE Apps workspace:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Embed SDK</title>
    <script src="https://portal.example.com/static/scripts/sdk/2.2.0/api.js"></script>
  </head>
  <body>
    <div id="ds-frame"></div>
    <script>
      const instance = DocSpace.SDK.initFrame({
        frameId: "ds-frame",
        src: "https://portal.example.com",
        mode: "manager",
      });
    </script>
  </body>
</html>
```

Replace `portal.example.com` with the address of your ONLYOFFICE Apps workspace.
You can check the latest SDK version in the [released tags](https://github.com/ONLYOFFICE/docspace-sdk-js/tags).

## SDK Modes

The SDK supports 11 modes, each rendering a different part of ONLYOFFICE Apps inside an iframe. Use the corresponding `init*` method or pass the `mode` value to `initFrame`:

| Mode | Method | Description |
|---|---|---|
| `manager` | [`initManager`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initmanager) | File and folder browser with full CRUD operations on rooms, folders, and files |
| `editor` | [`initEditor`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initeditor) | Full-featured document editor. Requires `id` (file identifier) |
| `viewer` | [`initViewer`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initviewer) | Read-only document viewer. Requires `id` (file identifier) |
| `room-selector` | [`initRoomSelector`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initroomselector) | Dialog for selecting a room. Returns result via `onSelectCallback` event |
| `file-selector` | [`initFileSelector`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initfileselector) | Dialog for selecting a file. Returns result via `onSelectCallback` event |
| `system` | [`initSystem`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initsystem) | Headless mode without visible UI — used for API calls like `login`, `logout`, and `getUserInfo` |
| `public-room` | [`initPublicRoom`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initpublicroom) | Public room view with anonymous access to documents. Requires `requestToken` |
| `uploader` | [`initUploader`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#inituploader) | File upload interface for a specific folder. Requires `id` (target folder identifier) |
| `forms` | [`initForms`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initforms) | Forms gallery for a room. Requires `id` (room identifier). Supports `showMenu`, custom actions, and file upload |
| `chat` | [`initChat`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initchat) | AI chat interface. Bound to an AI agent when `agentId` is set, to the current user otherwise. Supports `entityId` to pass the room or folder the chat is opened from (the AI scopes tool calls to it), `fileId` and `threadId` to attach files or resume threads |
| `personal` | [`initPersonal`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/classes/SDK/#initpersonal) | Personal files browser: My Documents, Favorites, Recent, Trash. Supports `personalDestination` to pick the initial section and `navigateSection` to switch it |

### Examples

**Document editor:**

```typescript
const editor = sdk.initEditor({
  frameId: "ds-editor",
  src: "https://portal.example.com",
  id: 42, // file ID
  editorCustomization: { autosave: true, forcesave: true },
  events: {
    onAppReady: () => console.log("Editor loaded"),
    onEditorCloseCallback: () => history.back(),
  },
});
```

**File selector:**

```typescript
const selector = sdk.initFileSelector({
  frameId: "ds-selector",
  src: "https://portal.example.com",
  selectorType: "roomsOnly",
  events: {
    onSelectCallback: (file) => console.log("Selected:", file),
    onCloseCallback: () => console.log("Cancelled"),
  },
});
```

**Uploader:**

```typescript
const uploader = sdk.initUploader({
  frameId: "ds-uploader",
  src: "https://portal.example.com",
  id: "target-folder-id",
  acceptExtensions: ".docx,.xlsx,.pdf",
  isMultipleUpload: true,
  events: {
    onUploadSuccess: (file) => console.log("Uploaded:", file),
    onUploadError: (err) => console.error("Upload failed:", err),
  },
});
```

**Forms:**

```typescript
const forms = sdk.initForms({
  frameId: "ds-forms",
  src: "https://portal.example.com",
  id: "room-id",
  events: {
    onNavigate: (data) => console.log("Navigated:", data),
    onCustomAction: (data) => console.log("Action:", data),
    onUploadSuccess: (file) => console.log("Uploaded:", file),
  },
});

// Navigate to a section
await forms.navigateSection("completed-forms");

// Register custom context menu actions
await forms.setCustomActions({
  contextMenu: {
    file: [{ key: "export", label: "Export to CRM" }],
  },
});

// Upload a file
const file = document.querySelector("input[type=file]").files[0];
await forms.upload(file);
```

**AI Chat:**

```typescript
const chat = sdk.initChat({
  frameId: "ds-chat",
  src: "https://portal.example.com",
  agentId: 123,
  events: {
    onAppReady: () => console.log("Chat ready"),
  },
});
```

**Personal files:**

```typescript
const personal = sdk.initPersonal({
  frameId: "ds-personal",
  src: "https://portal.example.com",
  personalDestination: "favorites",
  events: {
    onNavigate: (data) => console.log("Section:", data.section),
  },
});
```

## Events

All events are optional. Pass them via the `events` field in the configuration object. The table below shows where each event fires; the full reference is [`TFrameEvents`](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/type-aliases/TFrameEvents/).

| Event | Fires in |
|---|---|
| `onAppReady`, `onAppError`, `onContentReady`, `onAuthSuccess`, `onSignOut` | All modes |
| `onAuthError` | All modes, only with OAuth authentication (`getToken` or `accessToken` set) |
| `onGetExternalData`, `onSetExternalData` | Any mode, when the frame asks the host to read or persist a value in external storage |
| `onEditorOpen`, `onFileManagerClick`, `onNoAccess`, `onNotFound` | Manager, Public room |
| `onEditorCloseCallback` | Editor, Viewer |
| `onDownload` | Manager, Public room, Editor, Viewer — with `downloadToEvent: true` |
| `onSelectCallback`, `onCloseCallback` | Room selector, File selector |
| `onUploadSuccess`, `onUploadError` | Uploader, Forms |
| `onUploadProgress` | Uploader |
| `onCustomAction` | Forms |
| `onNavigate` | Forms, Personal |

## Instance Methods

After initialization, the returned `SDKInstance` object provides methods to interact with ONLYOFFICE Apps:

```typescript
const system = sdk.initSystem({
  frameId: "ds-system",
  src: "https://portal.example.com",
  events: { onAppReady: () => console.log("ready") },
});

// Authentication
await system.login(email, passwordHash);
await system.logout();

// Data retrieval
const user = await system.getUserInfo();
const files = await system.getFiles();
const folders = await system.getFolders();
const rooms = await system.getRooms(filter);
const selection = await system.getSelection();

// Content management
await system.createFile(folderId, title, templateId);
await system.createFolder(parentFolderId, title);
await system.createRoom(title, roomType);

// Frame control
system.setConfig({ theme: "Dark" });
system.destroyFrame();

// Forms mode (via initForms)
await forms.navigateSection("library");
await forms.setCustomActions({ contextMenu: { file: [...] } });
await forms.upload(file);
```

All active instances are accessible via `sdk.frames`:

```typescript
const instance = sdk.frames["ds-frame"];
```

## Authorization

The SDK uses the active ONLYOFFICE Apps session for authentication. If the user is already signed in to the workspace, the SDK uses that session automatically.

If the user is not authenticated, a sign-in page is displayed inside the iframe. You can also authenticate programmatically using the `login` method in [system mode](#sdk-modes), or supply an OAuth access token via the `getToken` or `accessToken` config fields.

## Documentation

- [API Reference](https://api.onlyoffice.com/docspace/javascript-sdk/) — full configuration, methods, and events reference
- [React Component](https://api.onlyoffice.com/docspace/javascript-sdk/get-started/react-component/) — integration guide for React projects
- [Changelog](./CHANGELOG.md) — version history and release notes

## License

Apache-2.0. See [LICENSE](./LICENSE) for details.
