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

import { defaultConfig, FRAME_NAME, connectErrorText } from "../constants";
import type {
  TFrameConfig,
  TFrameEvents,
  TFrameFilter,
  TMessageData,
  TTask,
} from "../types";
import {
  getCSPErrorBody,
  getLoaderStyle,
  validateCSP,
  getFramePath,
} from "../utils";
import { InstanceMethods, MessageTypes } from "../enums";

/**
 * Represents an SDK instance for managing frames and communication with DocSpace.
 *
 * The SDKInstance class provides methods for initializing, managing, and communicating with
 * DocSpace frames. It handles frame creation, message passing, and various operations like
 * file management, user authentication, and room management.
 *
 * @remarks
 * The class implements a message-based communication system between the parent window
 * and the DocSpace frame.
 */
export class SDKInstance {
  #isConnected: boolean = false;
  #callbacks: ((data: object) => void)[] = [];
  #tasks: TTask[] = [];
  #classNames: string = "";
  /** Configuration options for the iframe. */
  config: TFrameConfig;

  constructor(config: TFrameConfig) {
    this.config = config;
  }

  private static _loaderCache = {
    style: new Map<string, HTMLStyleElement>(),
    container: document.createElement("div"),
    templates: new Map<string, HTMLElement>(),
  };

  private static _iframeCache: {
    template: HTMLIFrameElement;
    pathCache: Map<string, string>;
    styleCache: Map<string, Partial<CSSStyleDeclaration>>;
  };

  /**
   * Creates and returns a loader HTML element with specified configuration.
   *
   * @param config - The configuration object for the frame
   * @returns A container div element with the loader and its styles
   */
  #createLoader = (config: TFrameConfig): HTMLElement => {
    const { frameId, width, height } = config;
    const loaderClassName = `${frameId}-loader__element`;
    const templateKey = `${width}_${height}`;
    const styleCache = SDKInstance._loaderCache.style;
    const templateCache = SDKInstance._loaderCache.templates;

    if (!styleCache.has(loaderClassName)) {
      const style = document.createElement("style");
      style.textContent = getLoaderStyle(loaderClassName);

      const fragment = document.createDocumentFragment();
      fragment.appendChild(style);
      document.head.appendChild(fragment);

      styleCache.set(loaderClassName, style);
    }

    let container: HTMLElement;

    if (templateCache.has(templateKey)) {
      container = templateCache
        .get(templateKey)!
        .cloneNode(true) as HTMLElement;
      container.id = `${frameId}-loader`;
    } else {
      container = SDKInstance._loaderCache.container.cloneNode() as HTMLElement;

      Object.assign(container.style, {
        width,
        height,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        zIndex: "1",
        backgroundColor: "transparent",
        transition: "opacity 0.15s ease-out",
      });

      const loader = document.createElement("div");
      loader.className = loaderClassName;
      container.appendChild(loader);

      templateCache.set(templateKey, container.cloneNode(true) as HTMLElement);

      container.id = `${frameId}-loader`;
    }

    return container;
  };

  /**
   * Creates and configures an HTMLIFrameElement based on the provided configuration.
   *
   * @param config - The configuration object for creating the iframe
   * @returns A configured HTMLIFrameElement instance
   *
   * @remarks
   * The method handles special configurations for mobile view and CSP validation.
   * If CSP validation fails, it sets an error message in the iframe's srcdoc.
   */
  #createIframe = (config: TFrameConfig): HTMLIFrameElement => {
    if (!SDKInstance._iframeCache) {
      const template = document.createElement("iframe");
      template.allowFullscreen = true;
      template.setAttribute("allow", "storage-access *");

      SDKInstance._iframeCache = {
        template,
        pathCache: new Map<string, string>(),
        styleCache: new Map<string, Partial<CSSStyleDeclaration>>(),
      };
    }

    const { mode, id, frameId, type, width, height, src, events, checkCSP } =
      config;
    const isMobile = type === "mobile";

    const iframe =
      SDKInstance._iframeCache.template.cloneNode() as HTMLIFrameElement;

    const cacheKey = `${mode}_${id || ""}_${frameId}`;
    const styleCacheKey = `${width}_${height}_${
      isMobile ? "mobile" : "desktop"
    }`;

    let path = SDKInstance._iframeCache.pathCache.get(cacheKey);
    if (!path) {
      path = getFramePath(config);
      SDKInstance._iframeCache.pathCache.set(cacheKey, path);
    }

    iframe.id = frameId;
    iframe.name = `${FRAME_NAME}__#${frameId}`;
    iframe.src = src + path;

    let styleObj = SDKInstance._iframeCache.styleCache.get(styleCacheKey);

    if (!styleObj) {
      styleObj = {
        width: width!,
        height: height!,
        border: "0px",
        opacity: "0",
        ...(isMobile && {
          position: "fixed",
          overflow: "hidden",
          webkitOverflowScrolling: "touch",
        }),
      };
      SDKInstance._iframeCache.styleCache.set(styleCacheKey, styleObj);
    }

    Object.assign(iframe.style, styleObj);

    if (isMobile) {
      if (document.body.style.overscrollBehaviorY !== "contain") {
        document.body.style.overscrollBehaviorY = "contain";
      }

      if ("loading" in HTMLIFrameElement.prototype) {
        iframe.loading = "eager";
      }
    }

    if (checkCSP) {
      this.#setupCSPValidation(iframe, src, events);
    }

    return iframe;
  };

  /**
   * Sets up CSP validation for the iframe
   *
   * @param iframe - The iframe element to validate
   * @param src - The source URL to validate against
   * @param events - Event handlers that might be triggered
   */
  #setupCSPValidation(
    iframe: HTMLIFrameElement,
    src: string,
    events?: TFrameEvents
  ): void {
    requestAnimationFrame(() => {
      validateCSP(src).catch((e: Error) => {
        events?.onAppError?.(e.message);
        iframe.srcdoc = getCSPErrorBody(src);
        this.setIsLoaded();
      });
    });
  }

  /**
   * Sets the target frame as loaded by updating its styles and removing the loader element.
   * If the loader element is found and removed, it triggers the `onContentReady` event if it exists.
   *
   * @remarks
   * This method modifies the styles of the target frame to make it visible and adjusts its dimensions
   * based on the configuration. It also ensures the parent node's height is set to inherit.
   * Uses performance-optimized transitions for smooth appearance.
   */
  setIsLoaded(): void {
    const { frameId, width, height, events } = this.config;

    const targetFrame = document.getElementById(frameId);
    const parent = targetFrame?.parentElement;

    if (!targetFrame || !parent) return;

    requestAnimationFrame(() => {
      try {
        parent.style.width = width!;
        parent.style.height = height!;

        const loader = document.getElementById(`${frameId}-loader`);

        if (loader) {
          loader.style.opacity = "0";

          requestAnimationFrame(() => {
            try {
              if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
              }

              events?.onContentReady?.();
            } catch (error) {
              console.error("Error removing loader:", error);
              events?.onContentReady?.();
            }
          });
        } else {
          events?.onContentReady?.();
        }

        requestAnimationFrame(() => {
          Object.assign(targetFrame.style, {
            opacity: "1",
            position: "relative",
            width: width!,
            height: height!,
          });
        });
      } catch (error) {
        console.error("Error in setIsLoaded:", error);
        events?.onContentReady?.();
      }
    });
  }

  /**
   * Sends a message to the target iframe specified by the frameId in the configuration.
   * The message is serialized to a JSON string before being posted.
   *
   * @param message - The message object to be sent to the iframe.
   *
   * @remarks
   * The message object is expected to be of type `TTask`. The method constructs a message
   * object containing the frameId, type, and data, and posts it to the content window of
   * the target iframe. If the message contains functions, they are converted to their
   * string representations.
   */
  #sendMessage = (message: TTask) => {
    try {
      const { frameId, src } = this.config;

      const iframe = document.getElementById(
        frameId
      ) as HTMLIFrameElement | null;

      if (!iframe?.contentWindow) return;

      const messageEnvelope = {
        frameId,
        type: "",
        data: message,
      };

      iframe.contentWindow.postMessage(
        JSON.stringify(messageEnvelope, (_, value) =>
          typeof value === "function" ? value.toString() : value
        ),
        src
      );
    } catch (error) {
      this.#handleError(error as { message: "Failed to send message" });
    }
  };

  /**
   * Handles incoming messages from the iframe and processes them based on their type.
   * This function is a critical part of the communication system between the parent window
   * and the DocSpace frame.
   *
   * @param e - The MessageEvent containing the data to be processed
   */
  #onMessage = (e: MessageEvent) => {
    try {
      if (typeof e.data !== "string") return;

      const data = this.#parseMessageData(e.data);

      if (data.frameId !== this.config.frameId) return;

      switch (data.type) {
        case MessageTypes.OnMethodReturn:
          this.#handleMethodResponse(data);
          break;
        case MessageTypes.OnEventReturn:
          if (data.eventReturnData) {
            this.#processEvent(data.eventReturnData);
          }
          break;
        case MessageTypes.OnCallCommand:
          this.#executeCommand(data);
          break;
        case MessageTypes.Error:
          if (data.error) {
            this.#handleError(data.error);
          }
          break;
        default:
          console.warn("Unrecognized message type:", data.type);
      }
    } catch (error) {
      this.#handleError(error as { message: "Failed to process message" });
    }
  };

  /**
   * Parses a JSON string message into a TMessageData object.
   * Handles parsing errors gracefully by returning a structured error object.
   *
   * @param data - The JSON string to parse
   * @returns A TMessageData object, or an error object if parsing fails
   */
  #parseMessageData(data: string): TMessageData {
    try {
      const parsed = JSON.parse(data);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid message structure");
      }

      if (!parsed.frameId) {
        parsed.frameId = "";
      }

      return parsed as TMessageData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown parsing error";
      console.warn("Failed to parse message:", errorMessage);

      return {
        frameId: "error",
        type: MessageTypes.Error,
        commandName: "parseMessageData",
        error: {
          message: "Invalid message format: " + errorMessage,
        },
      };
    }
  }

  /**
   * Handles method response messages from the iframe.
   * Executes the next callback in the queue with the response data,
   * then processes the next task in the queue if available.
   *
   * @param data - The message data containing the method return data
   */
  #handleMethodResponse(data: TMessageData) {
    const callback = this.#callbacks.shift();

    if (callback) {
      try {
        callback(data.methodReturnData || {});
      } catch (error) {
        console.error("Error in callback execution:", error);
      }
    }

    if (this.#tasks.length > 0) {
      this.#sendMessage(this.#tasks.shift()!);
    }
  }

  /**
   * Processes event messages from the iframe by invoking the appropriate registered event handler.
   *
   * @param eventData - The event data received from the iframe
   */
  #processEvent(eventData?: TMessageData["eventReturnData"]): void {
    if (!eventData?.event) return;

    const eventName = eventData.event as keyof TFrameEvents;
    const handler = this.config.events?.[eventName];

    if (typeof handler === "function") {
      try {
        handler(eventData.data || {});
      } catch (error) {
        console.error("Event handler failed:", eventName, error);
      }
    }
  }

  /**
   * Executes a command received from the iframe by dynamically calling the corresponding method on this instance.
   *
   * @param data - The message data containing the command to execute and its parameters
   */
  #executeCommand(data: TMessageData): void {
    if (!data.commandName) return;

    const command = this[data.commandName as keyof this];

    if (typeof command === "function") {
      (command as (data: unknown) => void).call(this, data.commandData);
    }
  }

  #handleError(error: { message: string }) {
    console.error("SDK Error:", error);
    this.config.events?.onAppError?.(
      error instanceof Error ? error.message : "Unown error occurred"
    );
  }

  /**
   * Executes a method by sending a message to the connected frame.
   * If the message bus is not connected, it triggers an application error event.
   *
   * @param methodName - The name of the method to be executed.
   * @param params - The parameters to be passed to the method. Can be an object or null.
   * @param callback - A callback function that will be called with the response data.
   *
   * @remarks
   * The method checks if the message bus is connected. If not, it triggers an error event.
   * It then pushes the callback to the callbacks array and constructs a message object.
   * If there are other pending callbacks, it queues the message; otherwise, it sends the message immediately.
   */
  #executeMethod(
    methodName: string,
    params: object | null,
    callback: (data: object) => void
  ): void {
    if (!this.#isConnected && methodName !== InstanceMethods.SetConfig) {
      this.#handleError({ message: connectErrorText });
      return;
    }

    this.#callbacks.push(callback);
    const message = { type: "method", methodName, data: params };

    if (this.#callbacks.length > 1) {
      this.#tasks.push(message);
    } else {
      this.#sendMessage(message);
    }
  }

  /**
   * Prepares the frame configuration by merging with default config
   *
   * @param config - The configuration object for the iframe
   * @returns The merged configuration object
   */
  #prepareFrameConfig(config: TFrameConfig): TFrameConfig {
    const mergedConfig = { ...this.config, ...defaultConfig, ...config };

    if (mergedConfig.mode === "manager" || mergedConfig.mode === "system") {
      mergedConfig.noLoader = false;
    }

    return mergedConfig;
  }

  /**
   * Creates a container for the frame
   *
   * @param targetId - The ID of the target element
   * @returns Object containing the container element and reference to target element or null if target not found
   */
  #createContainer(
    targetId: string
  ): { container: HTMLElement; target: HTMLElement | null } | null {
    const target = document.getElementById(targetId);
    if (!target) return null;

    const existingContainer = document.getElementById(`${targetId}-container`);

    if (existingContainer) {
      const parentNode = existingContainer.parentNode;

      if (parentNode) {
        const restoredTarget = document.createElement("div");
        restoredTarget.id = targetId;

        parentNode.replaceChild(restoredTarget, existingContainer);

        const cacheKey = `${this.config.mode}_${this.config.id || ""}_${
          this.config.frameId
        }`;

        SDKInstance._iframeCache.pathCache.delete(cacheKey);

        return this.#setupContainer(restoredTarget);
      }
    }

    this.#classNames = target.className;
    return this.#setupContainer(target);
  }

  /**
   * Sets up the container for the given target element
   *
   * @param target - The target element to create a container for
   * @returns Object containing the container element and reference to target
   */
  #setupContainer(target: HTMLElement): {
    container: HTMLElement;
    target: HTMLElement | null;
  } {
    const renderContainer = document.createElement("div");

    renderContainer.id = target.id + "-container";
    renderContainer.className = "frame-container";

    Object.assign(renderContainer.style, {
      position: "relative",
      width: this.config.width,
      height: this.config.height,
    });

    return { container: renderContainer, target };
  }

  /**
   * Creates and configures the iframe element
   *
   * @returns The configured iframe element
   */
  #setupIframe(): HTMLIFrameElement {
    const iframe = this.#createIframe(this.config);

    Object.assign(iframe.style, {
      opacity: this.config.noLoader ? "1" : "0",
      zIndex: "2",
      position: this.config.noLoader ? "relative" : "absolute",
      width: this.config.noLoader ? this.config.width : "100%",
      height: this.config.noLoader ? this.config.height : "100%",
      top: "0",
      left: "0",
    });

    return iframe;
  }

  /**
   * Sets up event handlers for the iframe
   *
   * @param iframe - The iframe element
   */
  #setupFrameEventHandlers(iframe: HTMLIFrameElement): void {
    const handleFrameLoad = () => {
      window.addEventListener("message", this.#onMessage, false);
      this.#isConnected = true;

      if (this.config.noLoader) {
        this.config.events?.onContentReady?.();
      }

      iframe.removeEventListener("load", handleFrameLoad);
    };

    iframe.addEventListener("load", handleFrameLoad);
  }

  /**
   * Assembles all frame components and adds them to the DOM
   *
   * @param container - The container element
   * @param target - The target element to replace
   * @param iframe - The iframe element
   * @returns The iframe element
   */
  #assembleFrame(
    container: HTMLElement,
    target: HTMLElement | null,
    iframe: HTMLIFrameElement
  ): HTMLIFrameElement {
    const fragment = document.createDocumentFragment();

    if (!this.config.waiting || this.config.mode === "system") {
      fragment.appendChild(iframe);
    }

    if (!this.config.noLoader) {
      const frameLoader = this.#createLoader(this.config);
      fragment.appendChild(frameLoader);
    } else {
      container.style.height = this.config.height!;
      container.style.width = this.config.width!;
    }

    container.appendChild(fragment);

    if (target?.parentNode) {
      target.parentNode.insertBefore(container, target);
      target.remove();
    } else {
      target?.replaceWith(container);
    }

    return iframe;
  }

  /**
   * Registers the frame in the global registry
   */
  #registerFrame(): void {
    window.DocSpace.SDK.frames = window.DocSpace.SDK.frames || {};
    window.DocSpace.SDK.frames[this.config.frameId] = this;
  }

  /**
   * Initializes an iframe with the given configuration and appends it to the target element.
   *
   * @param config - The configuration object for the iframe.
   * @returns The created iframe element or null if initialization fails.
   */
  initFrame(config: TFrameConfig): HTMLIFrameElement | null {
    this.config = this.#prepareFrameConfig(config);

    const setupResult = this.#createContainer(this.config.frameId);

    if (!setupResult) return null;

    const { container, target } = setupResult;

    const iframe = this.#setupIframe();

    this.#setupFrameEventHandlers(iframe);
    this.#assembleFrame(container, target, iframe);
    this.#registerFrame();

    return iframe;
  }

  /**
   * Destroys the current frame instance and performs cleanup operations.
   * 
   * This method:
   * - Removes the iframe container from the DOM
   * - Replaces it with a div containing optional destroy text
   * - Cleans up associated cache entries
   * - Removes message event listeners
   * - Resets internal connection state and callback queues
   * - Removes the frame reference from global DocSpace SDK registry
   * 
   * After calling this method, the instance will no longer be functional
   * and a new instance should be created if needed.
   */
  destroyFrame(): void {
    const frameId = this.config.frameId;
    const containerElement = document.getElementById(`${frameId}-container`);

    const replacementDiv = document.createElement("div");
    replacementDiv.id = frameId;
    replacementDiv.className = this.#classNames;
    replacementDiv.innerHTML = this.config.destroyText || "";

    if (containerElement) {
      if (containerElement.parentNode) {
        containerElement.parentNode.replaceChild(
          replacementDiv,
          containerElement
        );
      } else {
        document.body.appendChild(replacementDiv);
      }

      if (SDKInstance._iframeCache) {
        const cacheKey = `${this.config.mode}_${this.config.id || ""}_${
          this.config.frameId
        }`;
        SDKInstance._iframeCache.pathCache.delete(cacheKey);
      }
    }

    window.removeEventListener("message", this.#onMessage);

    this.#isConnected = false;
    this.#callbacks = [];
    this.#tasks = [];

    const sdkFrames = window.DocSpace?.SDK?.frames;
    if (sdkFrames && frameId in sdkFrames) {
      delete sdkFrames[frameId];
    }
  }

  /**
   * Returns a promise that resolves with the result of executing a specified method.
   *
   * @param methodName - The name of the method to execute.
   * @param params - The parameters to pass to the method. Defaults to null.
   * @returns A promise that resolves to an object containing the result of the method execution or the current configuration if reloaded.
   */
  #getMethodPromise = (
    methodName: string,
    params: object | null = null
  ): Promise<object> => {
    return new Promise((resolve) => {
      this.#executeMethod(methodName, params, (data) => resolve(data));
    });
  };

  /**
   * Sets the configuration for the instance.
   *
   * @param config - The configuration object to be set. Defaults to `defaultConfig`.
   * @returns A promise that resolves to an object.
   */
  setConfig(config: TFrameConfig = defaultConfig): Promise<object> {
    this.config = { ...this.config, ...config };

    return this.#getMethodPromise(InstanceMethods.SetConfig, this.config);
  }

  /**
   * Retrieves the current configuration.
   *
   * @returns The current configuration object.
   */
  getConfig(): TFrameConfig {
    return this.config;
  }

  /**
   * Retrieves information about a folder.
   *
   * @returns A promise that resolves to an object containing folder information.
   */
  getFolderInfo(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetFolderInfo);
  }

  /**
   * Retrieves the current selection.
   *
   * @returns A promise that resolves to the current selection object.
   */
  getSelection(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetSelection);
  }

  /**
   * Retrieves a list of files.
   *
   * @returns A promise that resolves to an object containing the files.
   */
  getFiles(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetFiles);
  }

  /**
   * Retrieves a list of folders.
   *
   * @returns A promise that resolves to an object containing folder information.
   */
  getFolders(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetFolders);
  }

  /**
   * Retrieves a list of files and folders.
   * @returns A promise that resolves to an object containing the list of files and folders.
   */
  getList(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetList);
  }

  /**
   * Retrieves a list of rooms based on the provided filter.
   *
   * @param filter - The criteria used to filter the rooms.
   * @returns A promise that resolves to an object containing the filtered rooms.
   */
  getRooms(filter: TFrameFilter): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetRooms, filter);
  }

  /**
   * Retrieves user information.
   *
   * @returns A promise that resolves to an object containing user information.
   */
  getUserInfo(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetUserInfo);
  }

  /**
   * Retrieves the hash settings.
   *
   * @returns A promise that resolves to an object containing the hash settings.
   */
  getHashSettings(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetHashSettings);
  }

  /**
   * Opens a modal of the specified type with the given options.
   *
   * @param type - The type of modal to open.
   * @param options - An object containing options for the modal.
   * @returns A promise that resolves to an object containing the result of the modal operation.
   */
  openModal(type: string, options: object): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.OpenModal, { type, options });
  }

  /**
   * Creates a new file in the specified folder.
   *
   * @param folderId - The ID of the folder where the file will be created.
   * @param title - The title of the new file.
   * @param templateId - The ID of the template to be used for the new file.
   * @param formId - The ID of the form associated with the new file.
   * @returns A promise that resolves to an object representing the created file.
   */
  createFile(
    folderId: string,
    title: string,
    templateId: string,
    formId: string
  ): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateFile, {
      folderId,
      title,
      templateId,
      formId,
    });
  }

  /**
   * Creates a new folder within the specified parent folder.
   *
   * @param parentFolderId - The ID of the parent folder where the new folder will be created.
   * @param title - The title of the new folder.
   * @returns A promise that resolves to an object containing the details of the created folder.
   */
  createFolder(parentFolderId: string, title: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateFolder, {
      parentFolderId,
      title,
    });
  }

  /**
   * Creates a new room with the specified parameters.
   *
   * @param title - The title of the room.
   * @param roomType - The type of the room.
   * @param quota - (Optional) The quota for the room.
   * @param tags - (Optional) An array of tags associated with the room.
   * @param color - (Optional) The main color of the room logo.
   * @param cover - (Optional) The cover image of the room.
   * @param indexing - (Optional) Whether the room should be indexed (VDR only).
   * @param denyDownload - (Optional) Whether downloading is denied in the room (VDR only).
   * @returns A promise that resolves to an object representing the created room.
   */
  createRoom(
    title: string,
    roomType: string,
    quota?: number,
    tags?: string[],
    color?: string,
    cover?: string,
    indexing?: boolean,
    denyDownload?: boolean
  ): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateRoom, {
      title,
      roomType,
      ...(quota !== undefined && { quota }),
      ...(denyDownload !== undefined && { denyDownload }),
      ...(tags !== undefined && { tags }),
      ...(color !== undefined && { color }),
      ...(cover !== undefined && { cover }),
      ...(indexing !== undefined && { indexing }),
    });
  }

  /**
   * Sets the list view type for the instance.
   *
   * @param viewType - The type of view to set. This could be a string representing different view types (e.g., "grid", "list").
   * @returns A promise that resolves to an object indicating the result of the operation.
   */
  setListView(viewType: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.SetListView, { viewType });
  }

  /**
   * Creates a hash for the given password using the specified hash settings.
   *
   * @param password - The password to be hashed.
   * @param hashSettings - An object containing settings for the hash function.
   * @returns A promise that resolves to an object containing the hash.
   */
  createHash(password: string, hashSettings: object): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateHash, {
      password,
      hashSettings,
    });
  }

  /**
   * Logs in a user with the provided credentials.
   *
   * @param email - The email address of the user.
   * @param passwordHash - The hashed password of the user.
   * @param password - (Optional) The plaintext password of the user.
   * @param session - (Optional) A boolean indicating whether to create a session.
   * @returns A promise that resolves to an object containing the login result.
   */
  login(
    email: string,
    passwordHash: string,
    password?: string,
    session?: boolean
  ): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.Login, {
      email,
      passwordHash,
      ...(password !== undefined && { password }),
      ...(session !== undefined && { session }),
    });
  }

  /**
   * Logs out the current user by invoking the "logout" method.
   *
   * @returns A promise that resolves to an object upon successful logout.
   */
  logout(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.Logout);
  }

  /**
   * Creates a new tag with the specified name.
   *
   * @param name - The name of the tag to be created.
   * @returns A promise that resolves to an object representing the created tag.
   */
  createTag(name: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateTag, { name });
  }

  /**
   * Adds tags to a specified room.
   *
   * @param roomId - The unique identifier of the room to which tags will be added.
   * @param tags - An array of tags to be added to the room.
   * @returns A promise that resolves to an object containing the result of the operation.
   */
  addTagsToRoom(roomId: string, tags: string[]): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.AddTagsToRoom, {
      roomId,
      tags,
    });
  }

  /**
   * Removes specified tags from a room.
   *
   * @param roomId - The unique identifier of the room.
   * @param tags - An array of tags to be removed from the room.
   * @returns A promise that resolves to an object containing the result of the operation.
   */
  removeTagsFromRoom(roomId: string, tags: string[]): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.RemoveTagsFromRoom, {
      roomId,
      tags,
    });
  }

  /**
   * Executes a callback function within the editor context
   * 
   * @param callback - Function to be executed in the editor that receives data and editor instance as its parameter
   * @param data - Optional data object to be passed to the callback function
   */
  executeInEditor(callback: (instance:object, data?: object) => void, data?: object): void {
    this.#getMethodPromise(InstanceMethods.ExecuteInEditor, {
      callback, data
    });
  }
}
