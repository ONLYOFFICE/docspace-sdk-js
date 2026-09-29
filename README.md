# ONLYOFFICE Apps Embed SDK

The ONLYOFFICE Apps Embed SDK (ONLYOFFICE Apps is the new name of ONLYOFFICE DocSpace) lets developers integrate ONLYOFFICE Apps into web applications. Embed a full-featured file manager, document editor, room and file selectors, file uploader, forms gallery or AI chat — with just a few lines of code.

You can use it as an [npm package](#npm) for modern web applications or connect it via a [script tag](#script-tag) for a quick start. For React projects, there is also a ready-made [React component](https://api.onlyoffice.com/docspace/javascript-sdk/samples/react-samples/).

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
    onUploadSuccess: (files) => console.log("Uploaded:", files),
    onUploadError: (err) => console.error("Upload failed:", err.error),
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
| `onAuthError` | All modes, only in [OAuth mode](#authorization) (`getToken` or `accessToken` set) |
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
await system.createFile(folderId, title);
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

The SDK supports two ways to authenticate the embedded frame.

**Session (cookie) mode** is the default. The frame uses the active ONLYOFFICE Apps session: a user already signed in to the workspace is signed in inside the frame too. Otherwise a sign-in page is displayed inside the iframe, or the host signs the user in programmatically with `createHash` and `login` in [system mode](#sdk-modes). The session cookie the portal sets belongs to the browser, not to the host page: it survives a sign-out in the host application, and browsers that withhold third-party cookies from cross-origin iframes may not send it at all.

**OAuth mode** avoids both problems. It switches on when the config carries `getToken` (or a static `accessToken`) and works in every mode:

```typescript
const instance = sdk.initManager({
  frameId: "ds-frame",
  src: "https://portal.example.com",
  getToken: async () => {
    // The host backend holds the refresh token and exchanges it for a short-lived access token.
    const response = await fetch("/api/onlyoffice/token", { credentials: "include" });
    const { accessToken } = await response.json();
    return accessToken;
  },
  events: {
    onAuthError: ({ code, message }) => {
      console.warn(`ONLYOFFICE Apps auth failed: ${code} ${message}`);
      instance.destroyFrame();
    },
  },
});
```

How it works:

1. The user authorizes the host application once through the portal's OAuth 2.0 authorization-code flow with a consent screen. The host backend stores the refresh token; the user's portal password is never seen or stored.
2. The frame starts with `auth=oauth` and, instead of reading a cookie, asks the host for a token. The SDK calls `getToken`, the host backend exchanges the refresh token for an access token, and the SDK hands it to the frame. Every portal request then carries `Authorization: Bearer <token>`; no cookie is set.
3. When the token is a JWT (or `tokenExpiresAt` is set), the SDK calls `getToken` again one minute before expiry and pushes the fresh token into the frame, so no request fails. An opaque token is refreshed after the first `401`.
4. A sign-out in the host application ends the embedded session too: the backend stops issuing tokens and the host calls `destroyFrame`. Nothing remains in the browser that would open the portal in a new tab.

Rules of OAuth mode:

- Never expose the client secret or the refresh token to the browser; `getToken` returns only a short-lived access token.
- The token must carry the scopes the embedded page needs. A token that cannot read the user's profile lands in a no-access state.
- `login` and `logout` are not available: they reject with `SDKErrorCode.ModeMismatch`, because the host owns the session.
- The frame never shows a sign-in page. If no usable token arrives, it stays on a loader and fires `onAuthError` with a `code` from `TAuthErrorCode`: `TOKEN_RESOLVE_FAILED` (`getToken` threw, rejected or is missing), `TOKEN_UNAVAILABLE` (the frame waited 10 seconds for its first token), `TOKEN_REFRESH_FAILED` (no fresh token after a `401`) or `UNAUTHORIZED` (the portal rejected a fresh token: expired, revoked or lacking scopes). Re-authenticate the user or destroy the frame.

## Documentation

- [Getting Started](https://api.onlyoffice.com/docspace/javascript-sdk/get-started/) — prerequisites, quickstart, authentication and security
- [API Reference](https://api.onlyoffice.com/docspace/javascript-sdk/usage-sdk/) — full configuration, methods, and events reference
- [React Component](https://api.onlyoffice.com/docspace/javascript-sdk/samples/react-samples/) — integration guide for React projects
- [Changelog](./CHANGELOG.md) — version history and release notes

## License

Apache-2.0. See [LICENSE](./LICENSE) for details.
