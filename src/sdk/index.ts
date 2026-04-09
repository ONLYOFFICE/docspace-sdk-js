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

import type { TFrameConfig } from "../types";
import { SDKMode } from "../enums";
import { SDKInstance } from "../instance";

/**
 * Manages multiple {@link SDKInstance} objects and provides convenience wrappers
 * for each {@link SDKMode}.
 *
 * Calling any `init*` method with a `frameId` that already exists reinitializes
 * the existing instance; otherwise a new instance is created and stored in {@link SDK.frames}.
 *
 * @example
 * ```typescript
 * import { SDK } from '@onlyoffice/docspace-sdk-js';
 *
 * const sdk = new SDK();
 * const instance = sdk.initManager({
 *   frameId: 'ds-frame',
 *   src: 'https://docspace.example.com',
 * });
 * ```
 */
export class SDK {
  /**
   * Registry of all active instances, keyed by {@link TFrameConfig.frameId}.
   * Updated automatically by every `init*` call.
   */
  frames: Record<string, SDKInstance> = {};

  /**
   * Core factory method. Creates a new {@link SDKInstance} for the given config,
   * or reinitializes the existing one if `frameId` is already in {@link SDK.frames}.
   * Stores the result in {@link SDK.frames}.
   *
   * Prefer the mode-specific wrappers ({@link SDK.initManager}, {@link SDK.initEditor}, etc.)
   * which set `mode` automatically.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The created or reinitialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK, SDKMode } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   *
   * // Create a manager instance
   * const instance = sdk.init({
   *   frameId: 'ds-frame',
   *   src: 'https://docspace.example.com',
   *   mode: SDKMode.Manager,
   * });
   *
   * // Reinitialize the same frame in a different mode — sdk.frames['ds-frame'] is reused
   * sdk.init({ frameId: 'ds-frame', src: 'https://docspace.example.com', mode: SDKMode.Editor, id: 42 });
   * ```
   */
  init = (config: TFrameConfig): SDKInstance => {
    const { frameId } = config;
    const existingInstance = this.frames[frameId];

    if (existingInstance) {
      existingInstance.initFrame(config);
      return existingInstance;
    }

    const instance = new SDKInstance(config);
    instance.initFrame(config);

    this.frames[frameId] = instance;

    return instance;
  };

  /**
   * Alias for {@link SDK.init}. Prefer the mode-specific wrappers instead.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The created or reinitialized {@link SDKInstance}.
   */
  initFrame = (config: TFrameConfig) => this.init(config);

  /**
   * Initializes a frame in {@link SDKMode.Manager} mode — a file/folder browser
   * with full CRUD operations on rooms, folders, and files.
   * Forces `mode` to {@link SDKMode.Manager}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK, ManagerViewMode, FilterSortBy, FilterSortOrder } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const instance = sdk.initManager({
   *   frameId: 'ds-frame',
   *   src: 'https://docspace.example.com',
   *   viewAs: ManagerViewMode.Table,
   *   showFilter: true,
   *   showMenu: true,
   *   filter: { sortBy: FilterSortBy.Name, sortOrder: FilterSortOrder.Ascending },
   *   events: {
   *     onAppReady: () => console.log('ready'),
   *     onFileManagerClick: (item) => console.log('clicked:', item),
   *   },
   * });
   * ```
   */
  initManager = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Manager });

  /**
   * Initializes a frame in {@link SDKMode.Viewer} mode — read-only document viewer.
   * Forces `mode` to {@link SDKMode.Viewer}. Requires {@link TFrameConfig.id}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const instance = sdk.initViewer({
   *   frameId: 'ds-frame',
   *   src: 'https://docspace.example.com',
   *   id: 42,
   *   events: {
   *     onAppReady: () => console.log('ready'),
   *     onNoAccess: () => console.warn('access denied'),
   *     onNotFound: () => console.warn('document not found'),
   *   },
   * });
   * ```
   */
  initViewer = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Viewer });

  /**
   * Initializes a frame in {@link SDKMode.Editor} mode — full document editor.
   * Forces `mode` to {@link SDKMode.Editor}. Requires {@link TFrameConfig.id}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK, EditorType } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const instance = sdk.initEditor({
   *   frameId: 'ds-frame',
   *   src: 'https://docspace.example.com',
   *   id: 42,
   *   editorType: EditorType.Desktop,
   *   editorCustomization: { autosave: true, forcesave: true },
   *   events: {
   *     onAppReady: () => console.log('ready'),
   *     onEditorCloseCallback: () => history.back(),
   *   },
   * });
   * ```
   */
  initEditor = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Editor });

  /**
   * Initializes a frame in {@link SDKMode.RoomSelector} mode — a dialog for selecting a room.
   * Forces `mode` to {@link SDKMode.RoomSelector}.
   * The selected room is returned via {@link TFrameEvents.onSelectCallback}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const instance = sdk.initRoomSelector({
   *   frameId: 'ds-frame',
   *   src: 'https://docspace.example.com',
   *   showSelectorHeader: true,
   *   showSelectorCancel: true,
   *   events: {
   *     onSelectCallback: (room) => console.log('selected:', room),
   *     onCloseCallback: () => console.log('cancelled'),
   *   },
   * });
   * ```
   */
  initRoomSelector = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.RoomSelector });

  /**
   * Initializes a frame in {@link SDKMode.FileSelector} mode — a dialog for selecting a file.
   * Forces `mode` to {@link SDKMode.FileSelector}.
   * The selected file is returned via {@link TFrameEvents.onSelectCallback}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK, SelectorFilterType } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const instance = sdk.initFileSelector({
   *   frameId: 'ds-frame',
   *   src: 'https://docspace.example.com',
   *   selectorType: SelectorFilterType.UserOnly,
   *   withBreadCrumbs: true,
   *   withSearch: true,
   *   events: {
   *     onSelectCallback: (file) => console.log('selected:', file),
   *     onCloseCallback: () => console.log('cancelled'),
   *   },
   * });
   * ```
   */
  initFileSelector = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.FileSelector });

  /**
   * Initializes a frame in {@link SDKMode.System} mode — a blank page with a loader,
   * used to call system methods ({@link SDKInstance.login}, {@link SDKInstance.logout},
   * {@link SDKInstance.getUserInfo}) without rendering any DocSpace UI.
   * Forces `mode` to {@link SDKMode.System}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const system = sdk.initSystem({
   *   frameId: 'ds-system',
   *   src: 'https://docspace.example.com',
   *   events: { onAppReady: () => console.log('system ready') },
   * });
   *
   * system.getUserInfo().then((user) => console.log('current user:', user));
   * ```
   */
  initSystem = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.System });

  /**
   * Initializes a frame in {@link SDKMode.Uploader} mode — a file upload interface.
   * Forces `mode` to {@link SDKMode.Uploader}. Requires {@link TFrameConfig.id}
   * (the target folder ID).
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const uploader = sdk.initUploader({
   *   frameId: 'ds-uploader',
   *   src: 'https://docspace.example.com',
   *   id: 'folder-id',
   *   acceptExtensions: '.docx,.xlsx,.pdf',
   *   isMultipleUpload: true,
   *   events: {
   *     onUploadSuccess: (file) => console.log('uploaded:', file),
   *     onUploadError: (err) => console.error('error:', err),
   *   },
   * });
   * ```
   */
  initUploader = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Uploader });

  /**
   * Initializes a frame in {@link SDKMode.Forms} mode — a forms gallery for the room specified by `id`.
   * Forces `mode` to {@link SDKMode.Forms}. Sets `showMenu` to `true` by default.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const forms = sdk.initForms({
   *   frameId: 'ds-forms',
   *   src: 'https://docspace.example.com',
   *   id: 'room-id',
   *   showMenu: true,
   *   events: {
   *     onCustomAction: (data) => console.log('action:', data),
   *   },
   * });
   * ```
   */
  initForms = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Forms, showMenu: config.showMenu ?? true });

  /**
   * Initializes a frame in {@link SDKMode.Chat} mode — a full-page AI chat interface
   * for the agent specified by {@link TFrameConfig.agentId}.
   * Forces `mode` to {@link SDKMode.Chat}. Requires {@link TFrameConfig.agentId}.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The initialized {@link SDKInstance}.
   *
   * @example
   * ```typescript
   * import { SDK } from '@onlyoffice/docspace-sdk-js';
   *
   * const sdk = new SDK();
   * const chat = sdk.initChat({
   *   frameId: 'ds-chat',
   *   src: 'https://docspace.example.com',
   *   agentId: 123,
   *   events: {
   *     onAppReady: () => console.log('chat ready'),
   *   },
   * });
   * ```
   */
  initChat = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Chat });
}
