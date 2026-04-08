# ONLYOFFICE DocSpace JavaScript SDK

The ONLYOFFICE DocSpace JavaScript SDK allows developers to integrate ONLYOFFICE DocSpace functionality into web applications. Embed a full-featured file manager, document editor, room and file selectors, or file uploader — with just a few lines of code.

You can use it as an [npm package](#npm) for modern web applications or connect it via a [script tag](#script-tag) for a quick start. For React projects, there is also a ready-made [React component](https://api.onlyoffice.com/docspace/javascript-sdk/get-started/react-component/).

## Prerequisites

For the SDK to work correctly, you need to add your domain to the DocSpace allowlist:

1. Go to **DocSpace Settings → Developer Tools → JavaScript SDK**.
2. In the **Enter the address of DocSpace to embed** field, add the URL of your server's root directory.


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
  src: "https://your-docspace.com",
  events: {
    onAppReady: () => console.log("DocSpace is ready"),
    onAppError: (err) => console.error("Error:", err),
  },
});
```

The SDK provides both CommonJS and ES module builds, so it works with any modern bundler (Webpack, Vite, esbuild, etc.).

### Script tag

If you prefer not to use a package manager, include the *api.js* script directly from your DocSpace server:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>DocSpace SDK</title>
    <script src="https://your-docspace.com/static/scripts/sdk/2.2.0/api.js"></script>
  </head>
  <body>
    <div id="ds-frame"></div>
    <script>
      const instance = DocSpace.SDK.initFrame({
        frameId: "ds-frame",
        src: "https://your-docspace.com",
        mode: "manager",
      });
    </script>
  </body>
</html>
```

Replace `your-docspace.com` with the address of your ONLYOFFICE DocSpace server.
You can check the latest SDK version in the [released tags](https://github.com/ONLYOFFICE/docspace-sdk-js/tags).

## SDK Modes

The SDK supports 9 modes, each rendering a different DocSpace UI inside an iframe. Use the corresponding `init*` method or pass the `mode` value to `initFrame`:

| Mode | Method | Description |
|---|---|---|
| `manager` | [`initManager`](docs/classes/SDK.md#initmanager) | File and folder browser with full CRUD operations on rooms, folders, and files |
| `editor` | [`initEditor`](docs/classes/SDK.md#initeditor) | Full-featured document editor. Requires `id` (file identifier) |
| `viewer` | [`initViewer`](docs/classes/SDK.md#initviewer) | Read-only document viewer. Requires `id` (file identifier) |
| `room-selector` | [`initRoomSelector`](docs/classes/SDK.md#initroomselector) | Dialog for selecting a room. Returns result via `onSelectCallback` event |
| `file-selector` | [`initFileSelector`](docs/classes/SDK.md#initfileselector) | Dialog for selecting a file. Returns result via `onSelectCallback` event |
| `system` | [`initSystem`](docs/classes/SDK.md#initsystem) | Headless mode without visible UI — used for API calls like `login`, `logout`, and `getUserInfo` |
| `public-room` | [`init`](docs/classes/SDK.md#init) | Public room view with anonymous access to documents. Requires `requestToken`. Use `sdk.init({ mode: "public-room", ... })` |
| `uploader` | [`initUploader`](docs/classes/SDK.md#inituploader) | File upload interface for a specific folder. Requires `id` (target folder identifier) |
| `forms` | [`initForms`](docs/classes/SDK.md#initforms) | Forms gallery for a room. Requires `id` (room identifier). Supports `showMenu`, custom actions, and file upload |

### Examples

**Document editor:**

```typescript
const editor = sdk.initEditor({
  frameId: "ds-editor",
  src: "https://your-docspace.com",
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
  src: "https://your-docspace.com",
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
  src: "https://your-docspace.com",
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
  src: "https://your-docspace.com",
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

## Events

All events are optional. Pass them via the `events` field in the configuration object. The table below shows which events are available in each mode:

| Event | Manager | Editor | Viewer | Room Sel. | File Sel. | System | Public Room | Uploader | Forms |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `onAppReady` | + | + | + | + | + | + | + | + | + |
| `onAppError` | + | + | + | + | + | + | + | + | + |
| `onContentReady` | + | + | + | + | + | + | + | + | + |
| `onAuthSuccess` | + | + | + | + | + | + | | + | + |
| `onSignOut` | + | + | + | + | + | + | | + | + |
| `onEditorOpen` | + | | | | | | + | | |
| `onEditorCloseCallback` | | + | + | | | | | | |
| `onFileManagerClick` | + | | | | | | + | | |
| `onDownload` | + | + | + | | | | + | | |
| `onNoAccess` | + | | | | | | + | | |
| `onNotFound` | + | | | | | | + | | |
| `onSelectCallback` | | | | + | + | | | | |
| `onCloseCallback` | | | | + | + | | | | |
| `onUploadSuccess` | | | | | | | | + | + |
| `onUploadError` | | | | | | | | + | + |
| `onUploadProgress` | | | | | | | | + | |
| `onCustomAction` | | | | | | | | | + |
| `onNavigate` | | | | | | | | | + |

## Instance Methods

After initialization, the returned `SDKInstance` object provides methods to interact with DocSpace:

```typescript
const system = sdk.initSystem({
  frameId: "ds-system",
  src: "https://your-docspace.com",
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

The SDK uses active DocSpace sessions for authentication. If the user is already logged in to the DocSpace portal, the SDK will use that session automatically.

If the user is not authenticated, a sign-in page will be displayed inside the iframe. You can also authenticate programmatically using the `login` method in [system mode](#sdk-modes).

## Documentation

- [API Reference](https://api.onlyoffice.com/docspace/javascript-sdk/) — full configuration, methods, and events reference
- [React Component](https://api.onlyoffice.com/docspace/javascript-sdk/get-started/react-component/) — integration guide for React projects
- [Changelog](./CHANGELOG.md) — version history and release notes

## License

Apache-2.0. See [LICENSE](./LICENSE) for details.
