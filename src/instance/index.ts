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
 * @example
 * ```typescript
 * import { SDK } from '@onlyoffice/docspace-sdk-js';
 *
 * const sdk = new SDK();
 *
 * const instance = sdk.initFrame({
 *   frameId: 'docspace-frame',
 *   src: 'https://your-docspace-domain.com',
 *   width: '100%',
 *   height: '600px',
 *   mode: 'manager'
 * });
 *
 * const userInfo = await instance.getUserInfo();
 * console.log('Current user:', userInfo);
 * ```
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
   * Creates a loading indicator for the DocSpace frame.
   *
   * @param config - Frame configuration containing frameId, width, and height
   * @returns A container div element with the loader ready for DOM insertion
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
   * Creates and configures an iframe element for the DocSpace interface.
   *
   * @param config - Frame configuration containing frameId, src, dimensions, and mode
   * @returns A configured HTMLIFrameElement ready for DOM insertion
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
   * Sets up Content Security Policy validation for the iframe.
   *
   * @param iframe - The iframe element to validate
   * @param src - The source URL to validate
   * @param events - Optional event handlers for validation errors
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
   * Orchestrates the complete loading state transition by implementing sophisticated
   * frame finalization, visual transition management, and user event coordination.
   * This method serves as the loading completion controller that ensures smooth
   * transition from initialization to operational state while providing optimal
   * user experience through coordinated animations and proper resource cleanup.
   *
   * @example
   * ```typescript
   * sdkInstance.setIsLoaded();
   * console.log('Frame loading completed and content is ready');
   * ```
   *
   * @example
   * ```typescript
   * try {
   *   await customFrameSetup();
   *   sdkInstance.setIsLoaded();
   * } catch (error) {
   *   console.error('Setup failed:', error);
   *   sdkInstance.setIsLoaded();
   * }
   * ```
   *
   * @returns void - This method performs side effects by updating frame appearance
   *               and triggering events without returning values, focusing on
   *               state transition and user experience optimization
   *
   * @throws {Error} May throw if frame elements cannot be accessed or if style
   *                 modifications fail due to browser security restrictions
   *
   * @see {@link initFrame} For the initial frame setup process before loading completion
   * @see {@link destroyFrame} For cleanup operations when frames are no longer needed
   * @see {@link setConfig} For configuration updates that affect loading behavior
   * @see {@link TFrameConfig.events.onContentReady} For the callback triggered by this method
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
   * Sends a message to the DocSpace iframe.
   *
   * @param message - The message object to send to the iframe
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
   * Handles incoming messages from the DocSpace iframe.
   *
   * @param e - The MessageEvent containing the message data
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
   * Parses JSON message data from the DocSpace iframe.
   *
   * @param data - The JSON string to parse
   * @returns Parsed message data or error object if parsing fails
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
   * Processes method response messages and executes callbacks.
   *
   * @param data - The message data containing the method response
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
   * Processes event data received from DocSpace iframe and dispatches to registered event handlers.
   *
   * @param eventData - The optional event data containing event name and payload
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
   * Executes commands received from DocSpace iframe by invoking the corresponding SDK method.
   *
   * @param data - The message data containing command name and parameters
   */
  #executeCommand(data: TMessageData): void {
    if (!data.commandName) return;

    const command = this[data.commandName as keyof this];

    if (typeof command === "function") {
      (command as (data: unknown) => void).call(this, data.commandData);
    }
  }

  /**
   * Handles errors by logging to console and notifying registered error handlers.
   *
   * @param error - The error object containing error information
   */
  #handleError(error: { message: string }) {
    console.error("SDK Error:", error);
    this.config.events?.onAppError?.(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }

  /**
   * Executes methods on the DocSpace iframe using message-based communication.
   *
   * @param methodName - The DocSpace method name to execute
   * @param params - Parameters for the method or null if none required
   * @param callback - Function called with response data when execution completes
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
   * Merges user configuration with instance and system defaults.
   *
   * @param config - User-provided configuration object
   * @returns Merged configuration ready for frame initialization
   */
  #prepareFrameConfig(config: TFrameConfig): TFrameConfig {
    const mergedConfig = { ...this.config, ...defaultConfig, ...config };

    if (mergedConfig.mode === "manager" || mergedConfig.mode === "system") {
      mergedConfig.noLoader = false;
    }

    return mergedConfig;
  }

  /**
   * Creates a container element for frame initialization and handles existing container cleanup.
   *
   * @param targetId - The DOM element ID to be replaced by the container
   * @returns Container setup object with container and target elements, or null if target not found
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
   * Configures and styles the container element for frame presentation.
   *
   * @param target - The target element to be replaced by the container
   * @returns Container setup object with the configured container and target elements
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
   * Creates and applies styling to the iframe element for DocSpace integration.
   *
   * @returns The configured HTMLIFrameElement ready for DOM insertion
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
   * Sets up event handlers for iframe loading and message communication.
   *
   * @param iframe - The iframe element to attach event handlers to
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
   * Assembles and integrates frame components into the DOM.
   *
   * @param container - The container element for frame components
   * @param target - The target element to be replaced, or null if not required
   * @param iframe - The configured iframe element for DocSpace integration
   * @returns The integrated iframe element ready for communication
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
   * Registers the current frame instance in the global DocSpace SDK registry.
   */
  #registerFrame(): void {
    window.DocSpace.SDK.frames = window.DocSpace.SDK.frames || {};
    window.DocSpace.SDK.frames[this.config.frameId] = this;
  }

  /**
   * Initializes an iframe with the given configuration and appends it to the target element.
   *
   * This is the core method that sets up the DocSpace iframe within your application.
   * It handles container creation, iframe setup, event handlers, and frame registration.
   * The method supports various DocSpace modes including viewer, editor, manager, and more.
   *
   * @param config - The configuration object for the iframe containing all initialization settings
   * 
   * @returns The created iframe element or null if initialization fails (e.g., target element not found)
   * @example
   * ```typescript
   * const iframe = sdkInstance.initFrame({
   *   frameId: 'docspace-frame',
   *   src: 'https://your-docspace.com',
   *   mode: 'viewer',
   *   width: '100%',
   *   height: '600px',
   *   id: 'document-123'
   * });
   *
   * if (iframe) {
   *   console.log('Frame initialized successfully');
   * } else {
   *   console.error('Failed to initialize frame - target element not found');
   * }
   * ```
   *
   * @example
   * ```typescript
   * const iframe = sdkInstance.initFrame({
   *   frameId: 'editor-frame',
   *   src: 'https://your-docspace.com',
   *   mode: 'editor',
   *   width: '100%',
   *   height: '800px',
   *   id: 'document-456',
   *   events: {
   *     onContentReady: () => console.log('Editor loaded'),
   *     onDocumentReady: () => console.log('Document ready for editing'),
   *     onAppError: (error) => console.error('Editor error:', error)
   *   }
   * });
   * ```
   *
   * @throws {Error} May throw if configuration contains invalid values or target element cannot be accessed
   * 
   * @see {@link setConfig} - For updating configuration after initialization
   * @see {@link getConfig} - For retrieving current configuration
   * @see {@link destroyFrame} - For properly cleaning up the frame
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
   * Destroys the current frame instance and performs comprehensive cleanup operations.
   *
   * This method performs a complete teardown of the DocSpace frame and all associated resources,
   * ensuring proper memory management and preventing resource leaks in single-page applications.
   * It's essential for dynamic applications that create and destroy frames frequently, as well as
   * for implementing graceful shutdowns and transitions between different DocSpace instances.
   *
   * After calling this method, the instance will no longer be functional
   * and a new instance should be created if needed.
   *
   * @example
   * ```typescript
   * sdkInstance.destroyFrame();
   * console.log('Frame destroyed and resources cleaned up');
   * ```
   *
   * @example
   * ```typescript
   * try {
   *   sdkInstance.destroyFrame();
   *   
   *   const newInstance = new SDKInstance({
   *     frameId: 'new-docspace-frame',
   *     src: 'https://your-docspace.com',
   *     mode: 'editor'
   *   });
   *   newInstance.initFrame(newInstance.getConfig());
   * } catch (error) {
   *   console.error('Failed to replace frame:', error);
   * }
   * ```
   *
   * @see {@link initFrame} - For creating new frame instances
   * @see {@link setConfig} - For updating frame configuration before cleanup
   * @see {@link getConfig} - For retrieving current configuration before destruction
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
   * Sets the configuration for the instance and applies updates to the active frame.
   *
   * This method allows you to dynamically update the SDK instance configuration
   * after initialization. Changes are merged with the existing configuration and
   * propagated to the active frame. This is useful for runtime adjustments like
   * theme changes, size updates, or mode switching.
   *
   * @param config - The configuration object with properties to update. Only provided properties will be changed.
   *                 Defaults to `defaultConfig` if no parameter is provided.
   * @returns A promise that resolves to an object containing the update result
   * @example
   * ```typescript
   * const result = await sdkInstance.setConfig({
   *   theme: 'dark',
   *   width: '1200px',
   *   height: '800px'
   * });
   * console.log('Configuration updated:', result);
   * ```
   *
   * @example
   * ```typescript
   * try {
   *   await sdkInstance.setConfig({
   *     id: 'new-document-789',
   *     editorType: 'word'
   *   });
   *   console.log('Successfully switched to new document');
   * } catch (error) {
   *   console.error('Failed to update document:', error);
   * }
   * ```
   *
   * @throws {Error} May throw if the new configuration contains invalid values or if frame update fails
   * 
   * @see {@link getConfig} - For retrieving current configuration
   * @see {@link initFrame} - For initial frame setup
   */
  setConfig(config: TFrameConfig = defaultConfig): Promise<object> {
    this.config = { ...this.config, ...config };

    return this.#getMethodPromise(InstanceMethods.SetConfig, this.config);
  }

  /**
   * Retrieves the current configuration object for the SDK instance.
   *
   * This method returns a copy of the current configuration settings that define
   * how the DocSpace frame is initialized and behaves. The configuration includes
   * settings like frame dimensions, mode, theme, locale, event handlers, and more.
   * This is useful for debugging, state management, or creating new instances with
   * similar settings.
   *
   * @returns The current configuration object containing all active settings
   *   * @example
   * ```typescript
   * const config = sdkInstance.getConfig();
   *
   * console.log('Current mode:', config.mode);
   * console.log('Frame dimensions:', config.width, 'x', config.height);
   * console.log('Theme:', config.theme);
   * console.log('Locale:', config.locale);
   * ```
   *
   * @example
   * ```typescript
   * const currentConfig = sdkInstance.getConfig();
   * const newConfig = {
   *   ...currentConfig,
   *   frameId: 'new-frame-id',
   *   mode: 'editor',
   *   id: 'different-document-id'
   * };
   *
   * const newInstance = new SDKInstance(newConfig);
   * newInstance.initFrame(newConfig);
   * ```
   *
   * @example
   * ```typescript
   * const config = sdkInstance.getConfig();
   *
   * if (config.mode === 'viewer') {
   *   console.log('Document is in view-only mode');
   * } else if (config.mode === 'editor') {
   *   console.log('Document editing is available');
   * }
   * ```
   *
   * @example
   * ```typescript
   * const config = sdkInstance.getConfig();
   * console.log('Full configuration:', JSON.stringify(config, null, 2));
   *
   * if (!config.src) {
   *   console.error('Missing source URL in configuration');
   * }
   * ```
   *
   * @see {@link setConfig} - For updating configuration settings
   * @see {@link initFrame} - For initial configuration setup
   */
  getConfig(): TFrameConfig {
    return this.config;
  }

  /**
   * Retrieves comprehensive information about the current or specified folder.
   *
   * This method provides detailed metadata about a folder including its contents, permissions,
   * sharing settings, and hierarchical position. It's essential for building detailed folder
   * views, property dialogs, and administrative interfaces. The returned information includes
   * both folder-specific data and aggregated statistics about contained items.
   *
   * @example
   * ```javascript
   * const folderInfo = await docSpace.getFolderInfo();
   * console.log('Folder:', folderInfo.title);
   * console.log('Path:', folderInfo.path);
   * console.log('Files:', folderInfo.fileCount);
   * console.log('Subfolders:', folderInfo.folderCount);
   * console.log('Total Size:', formatBytes(folderInfo.totalSize));
   * ```
   *
   * @example
   * ```javascript
   * try {
   *   const info = await docSpace.getFolderInfo();
   *   
   *   const canCreate = info.permissions.includes('create');
   *   const canEdit = info.permissions.includes('edit');
   *   
   *   console.log(`Folder: ${info.title}`);
   *   console.log(`Permissions: Create=${canCreate}, Edit=${canEdit}`);
   * } catch (error) {
   *   console.error('Failed to load folder info:', error);
   * }
   * ```
   *
   * @returns A promise that resolves to an object containing comprehensive folder information including id, title, path, parent information, file/folder counts, total size, permissions, sharing status, creation/modification dates, and access metadata.
   *
   * @see {@link getFolders} - For retrieving multiple folder information
   * @see {@link getFiles} - For getting folder contents
   * @see {@link createFolder} - For creating subfolders
   */
  getFolderInfo(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetFolderInfo);
  }

  /**
   * Retrieves the current user selection for context-aware operations and bulk actions.
   *
   * This method returns detailed information about all currently selected items in the
   * DocSpace interface, enabling applications to perform context-sensitive operations,
   * bulk actions, and intelligent user interface updates. The selection includes both
   * files and folders with comprehensive metadata for each selected item.
   *
   * @example
   * ```typescript
   * const selection = await docSpace.getSelection();
   * console.log('Current selection:', selection);
   *
   * if (selection.items && selection.items.length > 0) {
   *   const files = selection.items.filter(item => item.type === 'file');
   *   const folders = selection.items.filter(item => item.type === 'folder');
   *   console.log(`Selected: ${files.length} files, ${folders.length} folders`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * try {
   *   const selection = await docSpace.getSelection();
   *   
   *   if (!selection.items?.length) {
   *     console.log('No items selected');
   *     return;
   *   }
   *   
   *   const canDelete = selection.items.every(item => item.permissions.canDelete);
   *   console.log('Can delete all selected items:', canDelete);
   * } catch (error) {
   *   console.error('Failed to get selection:', error);
   * }
   * ```
   *
   * @returns A promise that resolves to the current selection object containing selected items and metadata
   *
   * @throws {Error} Throws an error if unable to retrieve the current selection state
   * 
   * @see {@link getList} - For retrieving all available items in the current context
   * @see {@link openModal} - For opening modals with selected items as context
   * @see {@link setListView} - For optimizing view mode based on selection patterns
   */
  getSelection(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetSelection);
  }

  /**
   * Retrieves a list of files from the current context with comprehensive metadata.
   *
   * This method fetches all files accessible in the current context, providing detailed
   * information about each file including metadata, permissions, and modification history.
   * It's essential for building file browsers, dashboards, and file management interfaces.
   * The returned data respects user permissions and access controls.
   *   * @example
   * ```javascript
   * const files = await docSpace.getFiles();
   * console.log(`Found ${files.length} files`);
   *
   * files.forEach(file => {
   *   console.log(`${file.title} (${file.type}) - Modified: ${file.modified}`);
   * });
   * ```
   *
   * @example
   * ```javascript
   * const allFiles = await docSpace.getFiles();
   *
   * const documents = allFiles.filter(file =>
   *   ['docx', 'doc', 'pdf'].includes(file.extension.toLowerCase())
   * );
   *
   * console.log(`Found ${documents.length} document files`);
   * ```
   *
   * @returns A promise that resolves to an object containing an array of file objects. Each file includes properties like id, title, type, extension, size, modified date, permissions, and access metadata.
   *
   * @see {@link getFolders} - For retrieving folder information
   * @see {@link getList} - For combined file and folder listing
   * @see {@link createFile} - For creating new files
   */
  getFiles(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetFiles);
  }

  /**
   * Retrieves a list of folders from the current context with detailed information.
   *
   * This method fetches all folders accessible in the current context, providing comprehensive
   * information about folder structure, permissions, and contents. It's crucial for building
   * navigation interfaces, folder browsers, and organizational tools. The method respects
   * user access permissions and returns only folders the user can view.
   *   * @example
   * ```javascript
   * const folders = await docSpace.getFolders();
   * console.log(`Found ${folders.length} folders`);
   *
   * folders.forEach(folder => {
   *   console.log(`${folder.title} - Files: ${folder.fileCount}, Subfolders: ${folder.folderCount}`);
   * });
   * ```
   *
   * @example
   * ```javascript
   * const folders = await docSpace.getFolders();
   *
   * const editableFolders = folders.filter(folder => folder.permissions.edit);
   * const sharedFolders = folders.filter(folder => folder.shared);
   *
   * console.log(`Editable: ${editableFolders.length}`);
   * console.log(`Shared: ${sharedFolders.length}`);
   * ```
   *
   * @returns A promise that resolves to an object containing an array of folder objects. Each folder includes properties like id, title, parentId, fileCount, folderCount, size, permissions, creation date, and sharing status.
   *
   * @see {@link getFiles} - For retrieving file information
   * @see {@link getFolderInfo} - For detailed single folder information
   * @see {@link createFolder} - For creating new folders
   */
  getFolders(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetFolders);
  }

  /**
   * Retrieves a combined list of files and folders from the current context.
   *
   * This method provides a unified view of all files and folders in the current location,
   * making it ideal for building comprehensive file browsers, search interfaces, and
   * content management systems. The returned list includes mixed content types with
   * consistent metadata structure, allowing for unified handling and display.
   *   * @example
   * ```javascript
   * const items = await docSpace.getList();
   *
   * const files = items.filter(item => item.type === 'file');
   * const folders = items.filter(item => item.type === 'folder');
   *
   * console.log(`Total items: ${items.length}`);
   * console.log(`Files: ${files.length}, Folders: ${folders.length}`);
   * ```
   *
   * @example
   * ```javascript
   * const allItems = await docSpace.getList();
   *
   * const searchResults = allItems.filter(item =>
   *   item.title.toLowerCase().includes('report')
   * );
   *
   * console.log(`Found ${searchResults.length} items matching 'report'`);
   * ```
   *
   * @returns A promise that resolves to an object containing an array of mixed file and folder objects. Each item includes common properties like id, title, type ('file' or 'folder'), modified date, and type-specific metadata such as file size/extension or folder contents.
   *
   * @see {@link getFiles} - For files-only listing
   * @see {@link getFolders} - For folders-only listing
   * @see {@link getFolderInfo} - For current folder information
   */
  getList(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetList);
  }

  /**
   * Retrieves a list of rooms based on the provided filter criteria.
   *
   * This method allows you to fetch rooms from DocSpace with various filtering options
   * including search terms, sorting, pagination, and room type filtering. It's essential
   * for building room browsers, dashboards, and selection interfaces.
   *
   * @param filter - The criteria used to filter and sort the rooms
   * @returns A promise that resolves to an object containing the filtered rooms and metadata
   *
   * @example
   * ```typescript
   * const roomsResult = await sdkInstance.getRooms({
   *   page: 1,
   *   pageSize: 20
   * });
   *
   * console.log('Total rooms:', roomsResult.total);
   * console.log('Rooms:', roomsResult.rooms);
   * ```
   *
   * @example
   * ```typescript
   * const searchResults = await sdkInstance.getRooms({
   *   filterValue: 'project',
   *   roomType: 'collaboration',
   *   tags: ['development', 'frontend'],
   *   page: 1,
   *   pageSize: 50,
   *   sortBy: 'title',
   *   sortOrder: 'asc'
   * });
   *
   * console.log('Matching rooms:', searchResults.rooms.length);
   * ```
   *
   * @throws {Error} May throw if the filter parameters are invalid or if the user lacks permission to access rooms
   * @see {@link createRoom} - For creating new rooms
   * @see {@link addTagsToRoom} - For adding tags to existing rooms
   * @see {@link removeTagsFromRoom} - For removing tags from rooms
   */
  getRooms(filter: TFrameFilter): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetRooms, filter);
  }

  /**
   * Retrieves comprehensive current user profile information and session details.
   *
   * This method fetches detailed information about the currently authenticated user,
   * including profile data, permissions, preferences, and session metadata. The
   * information is essential for personalizing user interfaces, implementing role-based
   * access controls, and displaying user-specific content and capabilities.
   * 
   * @example
   * ```typescript
   * const userInfo = await docSpace.getUserInfo();
   * console.log('User information:', userInfo);
   * console.log('User name:', userInfo.displayName);
   * console.log('Email:', userInfo.email);
   * console.log('Role:', userInfo.role);
   * console.log('Status:', userInfo.isOnline ? 'Online' : 'Offline');
   * ```
   *
   * @example
   * ```typescript
   * try {
   *   const userInfo = await docSpace.getUserInfo();
   *   
   *   const isAdmin = userInfo.role === 'admin';
   *   const canManage = userInfo.role === 'manager' || isAdmin;
   *   
   *   console.log('User permissions:', { isAdmin, canManage });
   *   
   *   document.documentElement.setAttribute('data-theme', userInfo.theme || 'light');
   * } catch (error) {
   *   console.error('Failed to load user info:', error);
   * }
   * ```
   *
   * @returns A promise that resolves to an object containing comprehensive user information and session data
   *
   * @throws {Error} Throws an error if the user is not authenticated or user information cannot be retrieved
   * @see {@link login} - For authenticating users before retrieving their information
   * @see {@link logout} - For terminating user sessions and clearing user data
   * @see {@link setConfig} - For updating user preferences and configuration settings
   */
  getUserInfo(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetUserInfo);
  }

  /**
   * Retrieves the server's current password hashing configuration.
   *
   * This method fetches the cryptographic settings required for secure password hashing.
   * These settings should be used with the createHash() method to ensure compatibility
   * with the server's security requirements.
   *
   * @returns A promise that resolves to an object containing hash algorithm settings
   *   * @example
   * ```typescript
   * const hashSettings = await sdkInstance.getHashSettings();
   * console.log('Hash algorithm:', hashSettings.algorithm);
   * console.log('Salt length:', hashSettings.saltLength);
   * console.log('Iterations:', hashSettings.iterations);
   *
   * const passwordHash = await sdkInstance.createHash('userPassword123', hashSettings);
   *
   * await sdkInstance.login('user@example.com', passwordHash.hash);
   * ```
   *
   * @example
   * ```typescript
   * async function authenticateUser(email: string, password: string) {
   *   try {
   *     const hashSettings = await sdkInstance.getHashSettings();
   *
   *     const hashResult = await sdkInstance.createHash(password, hashSettings);
   *
   *     const loginResult = await sdkInstance.login(email, hashResult.hash);
   *
   *     return loginResult;
   *   } catch (error) {
   *     console.error('Authentication failed:', error.message);
   *     throw error;
   *   }
   * }
   * ```
   *
   * @throws {Error} Throws an error if hash settings cannot be retrieved from the server
   * @see {@link createHash} - For creating password hashes using these settings
   * @see {@link login} - For authenticating with hashed passwords
   */
  getHashSettings(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.GetHashSettings);
  }
  
  /**
   * Opens a modal dialog of the specified type with comprehensive configuration options.
   *
   * This method provides a unified interface for opening various types of modal dialogs
   * within DocSpace, including file operations, room management, user settings, and
   * administrative functions. Modals are displayed as overlay windows that maintain
   * context with the parent application while providing focused interfaces for
   * specific tasks.
   *
   * @example
   * ```typescript
   * const result = await docSpace.openModal('upload', {
   *   folderId: 'documents-folder-123',
   *   allowedExtensions: ['.pdf', '.docx', '.xlsx'],
   *   multiple: true
   * });
   * console.log('Upload completed:', result.uploadedFiles.length, 'files');
   * ```
   *
   * @example
   * ```typescript
   * try {
   *   const shareResult = await docSpace.openModal('share', {
   *     itemId: 'room-456',
   *     itemType: 'room',
   *     shareMode: 'collaborate',
   *     permissions: {
   *       canEdit: true,
   *       canDownload: true
   *     }
   *   });
   *   console.log('Share completed:', shareResult.sharedWith);
   * } catch (error) {
   *   console.error('Share failed:', error);
   * }
   * ```
   *
   * @param type - The type of modal to open (e.g., 'upload', 'share', 'properties', 'settings')
   * @param options - Configuration object containing modal-specific options and event handlers
   * @returns A promise that resolves to an object containing the result of the modal operation
   *
   * @throws {Error} Throws an error if the modal type is not supported or configuration is invalid
   * @see {@link getSelection} - For getting currently selected items to open modals for
   * @see {@link setConfig} - For configuring global modal behavior and appearance
   */
  openModal(type: string, options: object): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.OpenModal, { type, options });
  }
  
  /**
   * Creates a new file in the specified folder using templates and forms.
   *
   * This method allows you to programmatically create different types of files in DocSpace
   * including documents, spreadsheets, presentations, and custom forms. You can specify
   * templates for consistent formatting and associate forms for structured data collection.
   * The created file will inherit permissions from the parent folder.
   *
   * @example
   * ```javascript
   * const file = await docSpace.createFile(
   *   "folder123",
   *   "Project Proposal",
   *   "template456",
   *   "form789"
   * );
   * console.log('Created file:', file.title, 'ID:', file.id);
   * ```
   *
   * @example
   * ```javascript
   * try {
   *   const document = await docSpace.createFile(
   *     "documents-folder-id",
   *     "Meeting Notes",
   *     "document-template-id",
   *     ""
   *   );
   *   console.log('Document created successfully:', document.id);
   * } catch (error) {
   *   console.error('File creation failed:', error.message);
   * }
   * ```
   *
   * @param folderId - The ID of the folder where the file will be created. Must be a valid folder ID that the user has write access to.
   * @param title - The title of the new file. Will be used as the filename with appropriate extension based on template type.
   * @param templateId - The ID of the template to be used for the new file. Determines file type and initial content structure.
   * @param formId - The ID of the form associated with the new file. Use empty string if no form is needed.
   * @returns A promise that resolves to an object representing the created file with properties like id, title, type, and creation date.
   *
   * @see {@link createFolder} - For creating folders to organize files
   * @see {@link getFiles} - For retrieving created files
   * @see {@link initFrame} - For opening files in editor mode
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
   * Creates a new folder within the specified parent folder for content organization.
   *
   * This method allows you to programmatically create folders to organize files and other folders
   * in a hierarchical structure. Created folders inherit permissions from the parent folder
   * and can be used to establish project structures, departmental organization, or any
   * custom file management system. The operation respects DocSpace access controls.
   *
   * @example
   * ```javascript
   * const projectFolder = await docSpace.createFolder(
   *   "root-folder-id",
   *   "Project Alpha"
   * );
   * console.log('Created folder:', projectFolder.title, 'ID:', projectFolder.id);
   * ```
   *
   * @example
   * ```javascript
   * try {
   *   const newFolder = await docSpace.createFolder(
   *     "parent-folder-id",
   *     "Marketing Materials"
   *   );
   *   console.log('Folder created successfully:', newFolder.id);
   * } catch (error) {
   *   console.error('Folder creation failed:', error.message);
   * }
   * ```
   *
   * @param parentFolderId - The ID of the parent folder where the new folder will be created. Must be a valid folder ID with write permissions.
   * @param title - The title of the new folder. Should be unique within the parent folder and follow naming conventions.
   * @returns A promise that resolves to an object containing the details of the created folder including id, title, creation date, and access permissions.
   *
   * @see {@link createFile} - For creating files within folders
   * @see {@link getFolders} - For retrieving folder lists
   * @see {@link getFolderInfo} - For getting detailed folder information
   */
  createFolder(parentFolderId: string, title: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateFolder, {
      parentFolderId,
      title,
    });
  }

  /**
   * Creates a new room with the specified parameters and configuration.
   *
   * This method allows you to programmatically create different types of rooms in DocSpace
   * including collaboration rooms, public rooms, and custom rooms. You can configure
   * room properties like quotas, tags, branding, and access permissions during creation.
   *
   * @param title - The display name/title for the new room
   * @param roomType - The type of room to create (collaboration, public, custom, etc.)
   * @param quota - Optional storage quota limit for the room in bytes
   * @param tags - Optional array of tags to categorize and organize the room
   * @param color - Optional hex color code for the room's branding theme
   * @param cover - Optional cover image URL or file path for the room
   * @param indexing - Optional flag to enable/disable search indexing (VDR rooms only)
   * @param denyDownload - Optional flag to prevent file downloads (VDR rooms only)
   * 
   * @returns A promise that resolves to an object containing the created room details
   * 
   * @example
   * ```typescript
   * const room = await sdkInstance.createRoom(
   *   'Project Alpha Team',
   *   'collaboration'
   * );
   *
   * console.log('Created room:', room.id);
   * console.log('Room URL:', room.url);
   * ```
   *
   * @example
   * ```typescript
   * const projectRoom = await sdkInstance.createRoom(
   *   'Q1 Marketing Campaign',
   *   'collaboration',
   *   5368709120,
   *   ['marketing', 'q1-2024', 'campaign'],
   *   '#FF6B35',
   *   'https://example.com/covers/marketing-cover.jpg'
   * );
   *
   * console.log('Room created with quota:', projectRoom.quota);
   * console.log('Room tags:', projectRoom.tags);
   * ```
   *
   * @throws {Error} Throws if room creation fails due to permissions, quota limits, or invalid parameters
   * @see {@link getRooms} - For retrieving existing rooms
   * @see {@link addTagsToRoom} - For adding tags to the created room
   * @see {@link createFolder} - For creating folders within the room
   */
  createRoom(
    title: string,
    roomType: string | number,
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
   * Dynamically changes the list view display mode for enhanced user experience.
   *
   * This method allows applications to programmatically switch between different
   * view modes to optimize content presentation based on user preferences, screen
   * size, or content type. View changes are applied immediately and persist for
   * the user session, providing responsive and adaptive interfaces.
   *
   * @example
   * ```typescript
   * await docSpace.setListView('table');
   * console.log('View changed to table mode');
   * ```
   *
   * @example
   * ```typescript
   * const screenWidth = window.innerWidth;
   * let optimalView;
   *
   * if (screenWidth < 768) {
   *   optimalView = 'row';
   * } else if (screenWidth < 1200) {
   *   optimalView = 'table';
   * } else {
   *   optimalView = 'tile';
   * }
   *
   * try {
   *   await docSpace.setListView(optimalView);
   *   console.log('View optimized for screen size:', optimalView);
   * } catch (error) {
   *   console.error('Failed to change view:', error);
   * }
   * ```
   *
   * @param viewType - The view mode to set: 'row' (compact list), 'table' (detailed grid), or 'tile' (preview cards)
   * @returns A promise that resolves to an object indicating the result of the view change operation
   *
   * @throws {Error} Throws an error if the view type is not supported or the operation fails
   * @see {@link getList} - For retrieving content that will be displayed in the new view mode
   * @see {@link getConfig} - For getting current view configuration and defaults
   * @see {@link setConfig} - For setting default view preferences globally
   */
  setListView(viewType: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.SetListView, { viewType });
  }

  /**
   * Creates a hash for the given password using the specified hash settings.
   *
   * This method is typically used before authentication to create a secure hash
   * of the user's password that can be safely transmitted and stored.
   *
   * @param password - The plaintext password to be hashed
   * @param hashSettings - Configuration object for the hash function containing algorithm settings
   * @returns A promise that resolves to an object containing the generated password hash
   *
   * @example
   * ```typescript
   * const hashSettings = await sdkInstance.getHashSettings();
   *
   * const hashResult = await sdkInstance.createHash('userPassword123', hashSettings);
   * console.log('Password hash:', hashResult.hash);
   *
   * await sdkInstance.login('user@example.com', hashResult.hash);
   * ```
   *
   * @throws {Error} Throws an error if the password is empty or hash settings are invalid
   * @see {@link getHashSettings} - For retrieving the current hash settings
   * @see {@link login} - For using the generated hash in authentication
   */
  createHash(password: string, hashSettings: object): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateHash, {
      password,
      hashSettings,
    });
  }

  /**
   * Authenticates a user with the provided credentials.
   *
   * This method supports both password hash and plaintext password authentication.
   * For security reasons, it's recommended to use password hashing via createHash() method.
   *
   * @param email - The user's email address used for authentication
   * @param passwordHash - The hashed password (recommended) obtained from createHash() method
   * @param password - Optional plaintext password (not recommended for production)
   * @param session - Optional flag to create a persistent session (default: false)
   * @returns A promise that resolves to an object containing authentication result and user data
   *
   * @example
   * ```typescript
   * const hashSettings = await sdkInstance.getHashSettings();
   * const hashResult = await sdkInstance.createHash('userPassword123', hashSettings);
   *
   * const loginResult = await sdkInstance.login(
   *   'user@example.com',
   *   hashResult.hash,
   *   undefined,
   *   true
   * );
   *
   * console.log('Login successful:', loginResult.success);
   * console.log('User data:', loginResult.user);
   * ```
   *
   * @example
   * ```typescript
   * const loginResult = await sdkInstance.login(
   *   'user@example.com',
   *   '',
   *   'userPassword123',
   *   false
   * );
   * ```
   *
   * @throws {Error} Throws an error if authentication fails or credentials are invalid
   * @see {@link createHash} - For creating secure password hashes
   * @see {@link getHashSettings} - For retrieving hash configuration
   * @see {@link logout} - For ending the user session
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
   * Ends the current user session and logs out the user.
   *
   * This method clears the user's authentication state and session data,
   * effectively signing them out of the DocSpace application.
   *
   * @returns A promise that resolves to an object containing logout confirmation
   *
   * @example
   * ```typescript
   * const logoutResult = await sdkInstance.logout();
   * console.log('Logout successful:', logoutResult.success);
   *
   * try {
   *   await sdkInstance.logout();
   *   console.log('User has been logged out successfully');
   *   window.location.href = '/login';
   * } catch (error) {
   *   console.error('Logout failed:', error.message);
   * }
   * ```
   *
   * @throws {Error} Throws an error if logout operation fails
   * @see {@link login} - For user authentication
   */
  logout(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.Logout);
  }
  
  /**
   * Creates a new tag with the specified name.
   *
   * Tags provide a powerful way to organize and categorize content across your DocSpace.
   * They can be used for project management, content categorization, workflow organization,
   * and creating custom filtering systems for better content discovery.
   *
   * @param name - The name of the tag to be created. Should be descriptive and unique.
   * @returns A promise that resolves to an object representing the created tag with its ID and metadata.
   *
   * @example
   * ```typescript
   * const tag = await sdkInstance.createTag('Project Alpha');
   * console.log('Tag created:', tag.name, 'with ID:', tag.id);
   * ```
   *
   * @example
   * ```typescript
   * const tagNames = ['High Priority', 'Marketing', 'Review'];
   * 
   * for (const tagName of tagNames) {
   *   try {
   *     const tag = await sdkInstance.createTag(tagName);
   *     console.log(`Created tag: ${tagName}`);
   *   } catch (error) {
   *     console.error(`Failed to create tag ${tagName}:`, error);
   *   }
   * }
   * ```
   *
   * @throws {Error} May throw if tag name is invalid, already exists, or user lacks permission to create tags
   * @see {@link addTagsToRoom} - For applying created tags to rooms
   * @see {@link removeTagsFromRoom} - For removing tags from rooms
   */
  createTag(name: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateTag, { name });
  }
  
  /**
   * Adds tags to a specified room for organization and categorization.
   *
   * This method enables you to apply multiple tags to a room simultaneously, helping organize
   * rooms by project, department, priority, or any custom categorization system. Tags improve
   * discoverability and enable advanced filtering and search capabilities.
   *
   * @param roomId - The unique identifier of the room to which tags will be added.
   * @param tags - An array of tag names to be added to the room. Tags should already exist or will be created automatically.
   * @returns A promise that resolves to an object containing the result of the operation and updated room metadata.
   *
   * @example
   * ```typescript
   * await sdkInstance.addTagsToRoom('room-123', ['Project Alpha', 'High Priority']);
   * console.log('Tags added successfully to project room');
   * ```
   *
   * @example
   * ```typescript
   * const projectTags = ['Engineering', 'Development', 'Q1-2024'];
   * const result = await sdkInstance.addTagsToRoom('room-456', projectTags);
   * console.log('Room organized with tags:', projectTags);
   * ```
   *
   * @throws {Error} May throw if room ID is invalid, tags don't exist, or user lacks permission to modify room tags
   * @see {@link createTag} - For creating new tags before applying them
   * @see {@link removeTagsFromRoom} - For removing tags from rooms
   * @see {@link getRooms} - For retrieving rooms with their current tags
   */
  addTagsToRoom(roomId: string, tags: string[]): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.AddTagsToRoom, {
      roomId,
      tags,
    });
  }
  
  /**
   * Removes specified tags from a room for organization and categorization cleanup.
   *
   * This method enables you to remove multiple tags from a room simultaneously, helping maintain
   * clean and accurate room categorization. It's essential for tag management workflows, project
   * status updates, archive cleanup, and removing outdated or incorrect categorizations. The
   * operation is atomic - either all specified tags are removed or none are affected.
   *
   * @param roomId - The unique identifier of the room from which tags will be removed.
   * @param tags - An array of tag names to be removed from the room. Only existing tags will be processed.
   * @returns A promise that resolves to an object containing the result of the operation and updated room metadata.
   *   * @example
   * ```typescript
   * const result = await sdkInstance.removeTagsFromRoom(
   *   'room-456',
   *   ['In-Progress', 'Review-Pending', 'Draft']
   * );
   * console.log('Tags removed successfully:', result);
   * ```
   *
   * @example
   * ```typescript
   * const archivedRooms = await sdkInstance.getRooms({ tags: ['Archived'] });
   * const tagsToRemove = ['Active', 'In-Progress', 'Urgent'];
   * 
   * for (const room of archivedRooms.rooms) {
   *   await sdkInstance.removeTagsFromRoom(room.id, tagsToRemove);
   *   console.log(`Cleaned up tags for: ${room.title}`);
   * }
   * ```
   *
   * @throws {Error} May throw if room ID is invalid, tags don't exist on the room, or user lacks permission to modify room tags
   * @see {@link addTagsToRoom} - For adding tags to rooms
   * @see {@link createTag} - For creating new tags before applying them
   * @see {@link getRooms} - For retrieving rooms with their current tags
   */
  removeTagsFromRoom(roomId: string, tags: string[]): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.RemoveTagsFromRoom, {
      roomId,
      tags,
    });
  }
  
  /**
   * Executes custom functions within the editor context for advanced document manipulation.
   *
   * This method allows applications to run custom code directly within the document editor
   * environment, enabling advanced programmatic operations, content manipulation, automation
   * tasks, and integration with external systems. The callback function receives the editor
   * instance and optional data, providing full access to editor APIs and document content.
   *
   * @example
   * ```typescript
   * const templateData = {
   *   customerName: 'Acme Corporation',
   *   projectName: 'Digital Transformation',
   *   startDate: new Date().toLocaleDateString()
   * };
   *
   * docSpace.executeInEditor((editorInstance, data) => {
   *   editorInstance.insertText(`
   *     PROJECT PROPOSAL
   *     Client: ${data.customerName}
   *     Project: ${data.projectName}
   *     Date: ${data.startDate}
   *   `);
   * }, templateData);
   * ```
   *
   * @example
   * ```typescript
   * docSpace.executeInEditor((editorInstance, data) => {
   *   const documentContent = editorInstance.getDocumentContent();
   *   
   *   if (data.checkSpelling) {
   *     const spellCheckResults = editorInstance.runSpellCheck();
   *     spellCheckResults.forEach(issue => {
   *       if (issue.confidence > 0.8) {
   *         editorInstance.replaceText(issue.position, issue.suggestion);
   *       }
   *     });
   *   }
   *   
   *   editorInstance.saveDocument();
   * }, { checkSpelling: true });
   * ```
   *
   * @param callback - Function to be executed in the editor that receives the editor instance and optional data
   * @param data - Optional data object to be passed to the callback function for context and configuration
   *
   * @throws {Error} Throws an error if the editor context is not available or callback execution fails
   * @see {@link initEditor} - For initializing the editor before executing custom functions
   * @see {@link getSelection} - For getting selected content to operate on within the editor
   */
  executeInEditor(
    callback: (instance: object, data?: object) => void,
    data?: object
  ): void {
    this.#getMethodPromise(InstanceMethods.ExecuteInEditor, {
      callback,
      data,
    });
  }
}
