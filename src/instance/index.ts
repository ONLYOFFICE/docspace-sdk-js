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

import { defaultConfig, FRAME_NAME, connectErrorText, wrongMethodText } from "../constants";
import { SDKError, SDKErrorCode } from "../errors";
import type {
  TCreateRoomOptions,
  TFileInfo,
  TFilesResponse,
  TFolderInfo,
  TFrameConfig,
  TFrameEvents,
  TFrameFilter,
  TGetExternalDataRequest,
  THashSettings,
  TManagerViewMode,
  TMessageData,
  TRoomInfo,
  TRoomsResponse,
  TSetExternalDataPayload,
  TTask,
  TUserInfo,
  TCustomActionsConfig,
  TFormsSection,
  TLoginResult,
  TMethodError,
  TPersonalSection,
} from "../types";
import {
  getCSPErrorBody,
  getLoaderStyle,
  validateCSP,
  getFramePath,
} from "../utils";
import { InstanceMethods, MessageTypes, SDKMode } from "../enums";

/** @internal */
type TCallbackEntry = {
  methodName: string;
  resolve: (data: object) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

/**
 * Methods that keep the pre-2.2 contract: a portal error is resolved as `{ status, message }`
 * instead of rejecting with {@link SDKErrorCode.ApiError}.
 * @internal
 */
const LEGACY_STATUS_METHODS: ReadonlySet<string> = new Set([InstanceMethods.Login, InstanceMethods.CreateRoom]);

/** Keys an error payload from the portal must not carry to the host. @internal */
const ERROR_PAYLOAD_STRIP_KEYS = ["config", "request", "stack"] as const;

/** @internal */
type TPendingUploadEntry = {
  fileName: string;
  resolve: (data: object) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Manages a single ONLYOFFICE Apps iframe, handles postMessage communication,
 * and exposes methods for operating on the embedded ONLYOFFICE Apps UI.
 *
 * Instances are created and stored by {@link SDK}. Do not construct directly —
 * use {@link SDK.init} or any `init*` convenience wrapper.
 *
 * :::note
 * Every method that talks to the frame returns a promise that rejects with an {@link SDKError}:
 * {@link SDKErrorCode.ApiError} when the portal reports a failure (HTTP status in {@link SDKError.status}),
 * {@link SDKErrorCode.ModeMismatch} when the current mode has no such method,
 * {@link SDKErrorCode.Timeout} after {@link TFrameConfig.methodTimeout} and
 * {@link SDKErrorCode.Disconnected} when the frame is not connected. Two legacy methods differ:
 * {@link SDKInstance.login} and {@link SDKInstance.createRoom} resolve a portal failure as `{ status, message }`.
 * A portal older than ONLYOFFICE Apps 4.0 does not flag failures, so on such a portal every method resolves
 * the portal's error object (with `config`, `request` and `stack` removed) instead of rejecting.
 * :::
 *
 * @example
 * ```typescript
 * import { SDK } from '@onlyoffice/docspace-sdk-js';
 *
 * const sdk = new SDK();
 * const instance = sdk.initManager({
 *   frameId: 'ds-frame',
 *   src: 'https://portal.example.com',
 * });
 *
 * instance.getUserInfo().then((user) => console.log(user));
 * ```
 */
export class SDKInstance {
  #isConnected: boolean = false;
  #callIdCounter: number = 0;
  #callbacks: Map<number, TCallbackEntry> = new Map();
  #tasks: TTask[] = [];
  #classNames: string = "";
  #expectedOrigin: string = "";
  #iframe: HTMLIFrameElement | null = null;
  #uploadIdCounter: number = 0;
  #pendingUploads: Map<number, TPendingUploadEntry> = new Map();
  /** The iframe configuration options. See {@link TFrameConfig}. */
  config: TFrameConfig;

  /** @param config - Initial frame configuration. See {@link TFrameConfig}. */
  constructor(config: TFrameConfig) {
    this.config = config;
  }

  private static _loaderCache: {
    style: Map<string, HTMLStyleElement>;
    container: HTMLDivElement | null;
    templates: Map<string, HTMLElement>;
  } = {
    style: new Map<string, HTMLStyleElement>(),
    container: null,
    templates: new Map<string, HTMLElement>(),
  };

  private static _iframeTemplate: HTMLIFrameElement;

  /**
   * Creates a loading indicator for the ONLYOFFICE Apps frame.
   *
   * @param config - The frame configuration containing `frameId`, `width`, and `height`.
   * @returns A container `div` element with a loader, ready for DOM insertion.
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

      document.head.appendChild(style);

      styleCache.set(loaderClassName, style);
    }

    let container: HTMLElement;

    if (templateCache.has(templateKey)) {
      container = templateCache
        .get(templateKey)!
        .cloneNode(true) as HTMLElement;
      container.id = `${frameId}-loader`;
    } else {
      const baseContainer = SDKInstance._loaderCache.container
        ?? (SDKInstance._loaderCache.container = document.createElement("div"));
      container = baseContainer.cloneNode() as HTMLElement;

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
   * Creates and configures an iframe element for the ONLYOFFICE Apps interface.
   *
   * @param config - The frame configuration containing `frameId`, `id`, `type`, `src`, `width`, `height`, `events`, `checkCSP`, and `mode`.
   * @returns A configured `HTMLIFrameElement`, ready for DOM insertion.
   */
  #createIframe = (config: TFrameConfig): HTMLIFrameElement => {
    if (!SDKInstance._iframeTemplate) {
      const template = document.createElement("iframe");
      template.allowFullscreen = true;
      template.setAttribute("allow", "storage-access *");
      SDKInstance._iframeTemplate = template;
    }

    const { frameId, type, width, height, src, checkCSP } = config;
    const isMobile = type === "mobile";

    const iframe =
      SDKInstance._iframeTemplate.cloneNode() as HTMLIFrameElement;

    const path = getFramePath(config);

    iframe.id = frameId;
    iframe.name = `${FRAME_NAME}__#${frameId}`;
    iframe.src = src + path;

    Object.assign(iframe.style, {
      width: width!,
      height: height!,
      border: "0px",
      opacity: "0",
      ...(isMobile && {
        position: "fixed",
        overflow: "hidden",
        webkitOverflowScrolling: "touch",
      }),
    });

    if (isMobile) {
      if (document.body.style.overscrollBehaviorY !== "contain") {
        document.body.style.overscrollBehaviorY = "contain";
      }

      if ("loading" in HTMLIFrameElement.prototype) {
        iframe.loading = "eager";
      }
    }

    if (checkCSP) {
      this.#setupCSPValidation(iframe, src);
    }

    return iframe;
  };

  /**
   * Sets up Content Security Policy (CSP) validation for the iframe.
   *
   * @param iframe - The iframe element to validate.
   * @param src - The source URL to validate.
   */
  #setupCSPValidation(
    iframe: HTMLIFrameElement,
    src: string
  ): void {
    requestAnimationFrame(() => {
      validateCSP(src).catch((e: Error) => {
        this.#handleError(e, SDKErrorCode.CSPViolation);
        iframe.srcdoc = getCSPErrorBody(src);
        this.setIsLoaded();
      });
    });
  }

  /**
   * Marks the frame as loaded: fades out the loader spinner, reveals the iframe,
   * and fires {@link TFrameEvents.onContentReady}.
   *
   * The ONLYOFFICE Apps iframe calls this automatically once its content is ready, so most
   * integrations never need to. Call it manually to reveal the frame on your own schedule,
   * for example when the host page shows its own loading overlay. Every call re-applies the
   * iframe size and visibility and fires {@link TFrameEvents.onContentReady}; the loader is
   * removed by the first one.
   *
   * @example
   * ```typescript
   * instance.setIsLoaded();
   * ```
   *
   * @example
   * Reveal the frame from a host-side button instead of waiting for the iframe, then react
   * to the completion via {@link TFrameEvents.onContentReady}.
   * ```typescript
   * const instance = sdk.initManager({
   *   frameId: 'ds-frame',
   *   src: 'https://portal.example.com',
   *   events: { onContentReady: () => console.log('Frame is visible') },
   * });
   *
   * document.getElementById('show-frame').onclick = () => instance.setIsLoaded();
   * ```
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
        }

        requestAnimationFrame(() => {
          try {
            if (loader?.parentNode) {
              loader.parentNode.removeChild(loader);
            }

            Object.assign(targetFrame.style, {
              opacity: "1",
              position: "relative",
              width: width!,
              height: height!,
            });
          } catch (error) {
            console.error("Error in setIsLoaded:", error);
          }

          events?.onContentReady?.();
        });
      } catch (error) {
        console.error("Error in setIsLoaded:", error);
        events?.onContentReady?.();
      }
    });
  }

  /**
   * Sends a message to the ONLYOFFICE Apps iframe.
   *
   * @param message - The message object to send to the iframe.
   */
  #sendMessage = (message: TTask): boolean => {
    try {
      const { frameId, src } = this.config;

      if (!this.#iframe?.contentWindow) return false;

      const messageEnvelope = {
        frameId,
        type: "",
        callId: message.callId,
        data: message,
      };

      const isEditorExec = message.methodName === InstanceMethods.ExecuteInEditor;

      this.#iframe.contentWindow.postMessage(
        JSON.stringify(messageEnvelope, (_, value) => {
          if (typeof value !== "function") return value;
          return isEditorExec ? value.toString() : true;
        }),
        src
      );

      return true;
    } catch (error) {
      this.#handleError(error as { message: "Failed to send message" });
      return false;
    }
  };

  /** Single-flight guard for OAuth token resolution (the `getAuthToken` command). */
  #authTokenPromise: Promise<string> | null = null;

  /**
   * Resolves an OAuth access token via {@link TFrameConfig.getToken} (or the static
   * {@link TFrameConfig.accessToken}). Single-flight: concurrent requests share one
   * in-flight call; the cache is cleared once settled, so the next request re-invokes
   * `getToken` and yields a freshly refreshed token.
   */
  #resolveToken = (): Promise<string> => {
    if (this.#authTokenPromise) return this.#authTokenPromise;

    const { getToken, accessToken } = this.config;

    const source: Promise<string> = getToken
      ? Promise.resolve().then(() => getToken())
      : accessToken != null
      ? Promise.resolve(accessToken)
      : Promise.reject(
          new SDKError(
            SDKErrorCode.TokenResolveFailed,
            "OAuth mode requires a getToken callback or accessToken in config",
          ),
        );

    this.#authTokenPromise = source.finally(() => {
      this.#authTokenPromise = null;
    });

    return this.#authTokenPromise;
  };

  /**
   * Posts a resolved OAuth access token back to the iframe (reply to `getAuthToken`).
   * Mirrors {@link SDKInstance.#sendExternalDataReturn}; targets the exact frame origin.
   *
   * @param callId - Correlation ID copied from the incoming request.
   * @param data - `{ accessToken, expiresAt? }` to deliver to the frame.
   */
  #sendAuthTokenReturn = (
    callId: number,
    data: { accessToken: string; expiresAt?: number },
  ): void => {
    try {
      const { frameId, src } = this.config;

      if (!this.#iframe?.contentWindow) return;

      this.#iframe.contentWindow.postMessage(
        JSON.stringify({
          frameId,
          type: MessageTypes.AuthTokenReturn,
          callId,
          data,
        }),
        src,
      );
    } catch (error) {
      this.#handleError(error as { message: string });
    }
  };

  /**
   * Posts the resolved value of an `onGetExternalData` call back to the iframe.
   *
   * @param callId - Correlation ID copied from the incoming request.
   * @param data - Value returned by the handler. Forwarded as-is.
   */
  #sendExternalDataReturn = (callId: number, data: unknown): void => {
    try {
      const { frameId, src } = this.config;

      if (!this.#iframe?.contentWindow) return;

      this.#iframe.contentWindow.postMessage(
        JSON.stringify({
          frameId,
          type: MessageTypes.ExternalDataReturn,
          callId,
          data,
        }),
        src,
      );
    } catch (error) {
      this.#handleError(error as { message: string });
    }
  };

  /**
   * Handles incoming messages from the ONLYOFFICE Apps iframe.
   *
   * @param e - The MessageEvent containing the message data.
   */
  #onMessage = (e: MessageEvent) => {
    try {
      if (typeof e.data !== "string") return;

      if (!this.#expectedOrigin || e.origin !== this.#expectedOrigin) return;

      const data = this.#parseMessageData(e.data);

      if (data.frameId === "error" && data.error) {
        this.#handleError(data.error);
        return;
      }

      if (data.frameId !== this.config.frameId) return;

      if (!this.#isConnected) {
        this.#isConnected = true;
      }

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
      this.#handleError(error as { message: string }, SDKErrorCode.ParseError);
    }
  };

  /**
   * Parses JSON message data from the ONLYOFFICE Apps iframe.
   *
   * @param data - The JSON string to be parsed.
   * @returns The parsed message data, or an error object if parsing fails.
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
   * Processes method response messages and executes the corresponding callbacks.
   *
   * @param data - The message data containing the method response.
   */
  #handleMethodResponse(data: TMessageData) {
    let matchedId: number | undefined;

    if (data.callId !== undefined && this.#callbacks.has(data.callId)) {
      matchedId = data.callId;
    } else {
      // Fallback: oldest entry (FIFO) for backward compatibility
      const first = this.#callbacks.keys().next();
      if (!first.done) {
        matchedId = first.value;
      }
    }

    if (matchedId !== undefined) {
      const entry = this.#callbacks.get(matchedId)!;
      this.#callbacks.delete(matchedId);
      if (entry.timer) clearTimeout(entry.timer);
      try {
        this.#settleMethodResult(entry, data.methodReturnData);
      } catch (error) {
        console.error("Error in callback execution:", error);
      }
    }

    this.#drainNextTask();
  }

  /**
   * Resolves or rejects a pending method call from the portal's `methodReturnData`.
   *
   * - `"Wrong method for this mode"` rejects with {@link SDKErrorCode.ModeMismatch}.
   * - A payload flagged `isError: true` (client 4.0+) rejects with {@link SDKErrorCode.ApiError};
   *   the legacy `login` and `createRoom` resolve it as `{ status, message }` instead.
   * - A payload that looks like a serialized `AxiosError` from an older portal resolves,
   *   with `config`, `request` and `stack` removed so request bodies never reach the host.
   * - Anything else resolves as is (`{}` for an empty reply).
   *
   * @internal
   */
  #settleMethodResult(entry: TCallbackEntry, payload: unknown): void {
    if (payload === wrongMethodText) {
      entry.reject(
        new SDKError(SDKErrorCode.ModeMismatch, `${entry.methodName} is not available in ${this.config.mode} mode`)
      );
      return;
    }

    if (!payload || typeof payload !== "object") {
      entry.resolve(payload || {});
      return;
    }

    const record = payload as Record<string, unknown>;

    if (record.isError === true) {
      const { isError: _flag, ...sanitized } = this.#sanitizeErrorPayload(record) as TMethodError;
      if (LEGACY_STATUS_METHODS.has(entry.methodName)) {
        entry.resolve(sanitized);
        return;
      }
      const status = typeof sanitized.status === "number" ? sanitized.status : undefined;
      const message =
        typeof sanitized.message === "string" && sanitized.message
          ? sanitized.message
          : `${entry.methodName} failed${status !== undefined ? ` with status ${status}` : ""}`;
      entry.reject(new SDKError(SDKErrorCode.ApiError, message, false, { status, data: sanitized }));
      return;
    }

    entry.resolve(this.#isErrorLike(record) ? this.#sanitizeErrorPayload(record) : record);
  }

  /**
   * Whether a reply from a portal without the `isError` marker is a serialized error
   * (`AxiosError.toJSON()` output or a failed HTTP status).
   * @internal
   */
  #isErrorLike(record: Record<string, unknown>): boolean {
    return (
      record.name === "AxiosError" ||
      record.isAxiosError === true ||
      (typeof record.status === "number" && record.status >= 400 && typeof record.message === "string")
    );
  }

  /**
   * Returns a copy of an error payload without the request `config` (its `data` is the request
   * body, e.g. the password hash of `login`), the `request` object and the `stack`.
   * @internal
   */
  #sanitizeErrorPayload(record: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = { ...record };
    for (const key of ERROR_PAYLOAD_STRIP_KEYS) delete sanitized[key];
    return sanitized;
  }

  /**
   * Returns a promise rejected with {@link SDKErrorCode.ModeMismatch}. Mode-guarded methods
   * use it instead of throwing so that `.catch()` and `await` handle the guard the same way as
   * every other failure.
   * @internal
   */
  #rejectModeMismatch(message: string): Promise<never> {
    return Promise.reject(new SDKError(SDKErrorCode.ModeMismatch, message));
  }

  /**
   * Sends the next queued task and starts its timeout timer.
   * @internal
   */
  #drainNextTask(): void {
    if (this.#tasks.length === 0 || this.#callbacks.size === 0) return;

    const nextTask = this.#tasks.shift()!;
    const nextEntry = nextTask.callId !== undefined
      ? this.#callbacks.get(nextTask.callId)
      : undefined;

    if (nextEntry && nextTask.callId !== undefined) {
      nextEntry.timer = this.#createMethodTimer(nextTask.callId, nextEntry);
    }

    if (!this.#sendMessage(nextTask)) {
      this.#rejectAllPending("Frame disconnected");
    }
  }

  /**
   * Creates a timeout timer for an in-flight method call.
   * @internal
   */
  #createMethodTimer(
    callId: number,
    entry: TCallbackEntry
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      this.#callbacks.delete(callId);
      const err = new SDKError(SDKErrorCode.Timeout, "Method call timed out");
      entry.reject(err);
      this.#handleError(err);
      this.#drainNextTask();
    }, this.config.methodTimeout || 30000);
  }

  /**
   * Rejects all pending callbacks and uploads, then clears every queue.
   * @internal
   */
  #clearAllPending(error: SDKError): void {
    for (const entry of this.#callbacks.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.#callbacks.clear();
    this.#tasks = [];

    for (const [, pending] of this.#pendingUploads) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pendingUploads.clear();
  }

  /**
   * Rejects all pending method callbacks and clears the queue.
   * Does not touch {@link #pendingUploads} — uploads are resolved
   * separately via event handlers.
   * @internal
   */
  #rejectAllPending(reason: string): void {
    const err = new SDKError(SDKErrorCode.Disconnected, reason);

    for (const entry of this.#callbacks.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(err);
    }
    this.#callbacks.clear();
    this.#tasks = [];

    this.#isConnected = false;
    this.#handleError(err);
  }

  /**
   * Processes event data received from the ONLYOFFICE Apps iframe and dispatches it to the registered event handlers.
   *
   * @param eventData - The optional event data containing the event name and payload.
   */
  #processEvent(eventData?: TMessageData["eventReturnData"]): void {
    if (!eventData?.event) return;

    const eventName = eventData.event as keyof TFrameEvents;

    if (
      this.#pendingUploads.size > 0 &&
      (eventName === "onUploadSuccess" || eventName === "onUploadError")
    ) {
      const payload = eventData.data as { fileName?: string; message?: string } | undefined;
      const fileName = payload?.fileName;

      let matchedId: number | undefined;

      if (fileName) {
        // Match by fileName — exact match only, skip if no pending entry has this name.
        for (const [id, entry] of this.#pendingUploads) {
          if (entry.fileName === fileName) {
            matchedId = id;
            break;
          }
        }
      } else if (this.#pendingUploads.size > 0) {
        // No fileName in payload — resolve the oldest pending upload (FIFO).
        matchedId = this.#pendingUploads.keys().next().value;
      }

      if (matchedId !== undefined) {
        const pending = this.#pendingUploads.get(matchedId)!;
        clearTimeout(pending.timer);
        this.#pendingUploads.delete(matchedId);

        if (eventName === "onUploadSuccess") {
          pending.resolve(eventData.data || {});
        } else {
          pending.reject(new SDKError(SDKErrorCode.UploadFailed, payload?.message || "Upload failed"));
        }
      }
    }

    const handler = this.config.events?.[eventName];

    if (typeof handler === "function") {
      try {
        (handler as (data: unknown) => void)(eventData.data || {});
      } catch (error) {
        console.error("Event handler failed:", eventName, error);
      }
    }
  }

  /** Methods the iframe is allowed to invoke via `onCallCommand`. */
  static #allowedCommands: ReadonlySet<string> = new Set([
    "setIsLoaded",
    "setConfig",
    "getExternalData",
    "setExternalData",
    "getAuthToken",
  ]);

  /**
   * Executes commands received from the ONLYOFFICE Apps iframe by invoking the corresponding SDK method.
   * Only methods listed in {@link SDKInstance.#allowedCommands} are callable.
   *
   * @param data - The message data containing the command name and parameters.
   */
  #executeCommand(data: TMessageData): void {
    if (!data.commandName) return;

    if (!SDKInstance.#allowedCommands.has(data.commandName)) {
      console.warn("Blocked iframe command not in allowlist:", data.commandName);
      return;
    }

    if (data.commandName === "getExternalData") {
      const handler = this.config.events?.onGetExternalData;
      if (!handler) return;

      const req = data.commandData as TGetExternalDataRequest;

      Promise.resolve()
        .then(() => handler(req))
        .then((result) => this.#sendExternalDataReturn(req.callId, result))
        .catch((error) => this.#handleError(error as { message: string }));
      return;
    }

    if (data.commandName === "getAuthToken") {
      const req = (data.commandData ?? {}) as { callId: number };

      this.#resolveToken()
        .then((accessToken) =>
          this.#sendAuthTokenReturn(req.callId, { accessToken }),
        )
        .catch((error: unknown) => {
          // Deliberately NOT #handleError (that routes to onAppError);
          // token-resolution failures surface via onAuthError.
          const code =
            error instanceof SDKError
              ? error.code
              : SDKErrorCode.TokenResolveFailed;
          const message =
            (error as { message?: string })?.message ??
            "Failed to resolve auth token";
          this.config.events?.onAuthError?.({ code, message });
        });
      return;
    }

    if (data.commandName === "setExternalData") {
      const handler = this.config.events?.onSetExternalData;
      if (!handler) return;

      const payload = data.commandData as TSetExternalDataPayload;

      Promise.resolve()
        .then(() => handler(payload))
        .catch((error) => this.#handleError(error as { message: string }));
      return;
    }

    const command = this[data.commandName as keyof this];

    if (typeof command === "function") {
      (command as (data: unknown) => void).call(this, data.commandData);
    }
  }

  /**
   * Handles errors by logging them to the console and notifying the registered error handlers.
   *
   * @param error - The error object containing error information.
   */
  #handleError(error: { message: string }, code?: SDKErrorCode) {
    const sdkError =
      error instanceof SDKError
        ? error
        : new SDKError(code || SDKErrorCode.Disconnected, error.message || "Unknown error occurred");

    console.error("SDK Error:", sdkError);

    this.config.events?.onAppError?.(sdkError.message || "Unknown error occurred");
  }

  /**
   * Executes methods on the ONLYOFFICE Apps iframe using message-based communication.
   *
   * @param methodName - The name of the ONLYOFFICE Apps method to execute.
   * @param params - The parameters for the method, or null if none are required.
   * @param callback - The function called with the response data when execution completes.
   */
  #executeMethod(
    methodName: string,
    params: object | null,
    resolve: (data: object) => void,
    reject: (error: Error) => void
  ): void {
    if (!this.#isConnected && methodName !== InstanceMethods.SetConfig) {
      const err = new SDKError(SDKErrorCode.Disconnected, connectErrorText);
      this.#handleError(err);
      reject(err);
      return;
    }

    const callId = ++this.#callIdCounter;
    const entry: TCallbackEntry = { methodName, resolve, reject, timer: null };
    this.#callbacks.set(callId, entry);
    const message: TTask = { type: "method", methodName, data: params, callId };

    if (this.#callbacks.size > 1) {
      this.#tasks.push(message);
    } else {
      entry.timer = this.#createMethodTimer(callId, entry);
      if (!this.#sendMessage(message)) {
        this.#callbacks.delete(callId);
        if (entry.timer) clearTimeout(entry.timer);
        const err = new SDKError(SDKErrorCode.Disconnected, connectErrorText);
        this.#handleError(err);
        reject(err);
      }
    }
  }

  /**
   * Merges user configuration with instance and system defaults.
   *
   * @param config - The user-provided configuration object.
   * @returns The merged configuration, ready for frame initialization.
   */
  #prepareFrameConfig(config: TFrameConfig): TFrameConfig {
    const mergedConfig = { ...defaultConfig, ...this.config, ...config };

    if (mergedConfig.mode === SDKMode.Manager || mergedConfig.mode === SDKMode.System) {
      mergedConfig.noLoader = false;
    }

    if (mergedConfig.mode === SDKMode.Forms) {
      if (mergedConfig.showMenu === undefined) {
        mergedConfig.showMenu = true;
      }
      mergedConfig.noLoader = true;
    }

    if (mergedConfig.mode === SDKMode.Personal) {
      if (mergedConfig.showMenu === undefined) {
        mergedConfig.showMenu = true;
      }
      if (mergedConfig.infoPanelVisible === undefined) {
        mergedConfig.infoPanelVisible = true;
      }
      mergedConfig.noLoader = true;
    }

    return mergedConfig;
  }

  /**
   * Creates a container element for frame initialization and handles cleanup of any existing container.
   *
   * @param targetId - The ID of the DOM element to be replaced by the container.
   * @returns An object containing the container and target elements, or null if the target element was not found.
   */
  #createContainer(
    targetId: string
  ): { container: HTMLElement; target: HTMLElement | null } | null {
    let target: HTMLElement | null = document.getElementById(targetId);
    const existingContainer = document.getElementById(`${targetId}-container`);

    if (!target && !existingContainer) return null;

    if (existingContainer) {
      const parentNode = existingContainer.parentNode;

      if (parentNode) {
        const restoredTarget = document.createElement("div");
        restoredTarget.id = targetId;

        parentNode.replaceChild(restoredTarget, existingContainer);
        target = restoredTarget;
      }
    } else {
      this.#classNames = target!.className;
    }

    if (!target) return null;

    const container = document.createElement("div");
    container.id = `${targetId}-container`;
    container.className = "frame-container";

    Object.assign(container.style, {
      position: "relative",
      width: this.config.width,
      height: this.config.height,
    });

    return { container, target };
  }

  /**
   * Creates and applies styling to the iframe element for ONLYOFFICE Apps integration.
   *
   * @returns The configured `HTMLIFrameElement`, ready for DOM insertion.
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
   * @param iframe - The `HTMLIFrameElement` to attach event handlers.
   */
  #setupFrameEventHandlers(iframe: HTMLIFrameElement): void {
    window.removeEventListener("message", this.#onMessage);
    window.addEventListener("message", this.#onMessage, false);

    const handleFrameLoad = () => {
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
   * @param container - The container element for the frame components.
   * @param target - The target element to be replaced, or null if not required.
   * @param iframe - The configured `HTMLIFrameElement` for ONLYOFFICE Apps integration.
   * @returns The integrated iframe element, ready for communication.
   */
  #assembleFrame(
    container: HTMLElement,
    target: HTMLElement | null,
    iframe: HTMLIFrameElement
  ): HTMLIFrameElement {
    const fragment = document.createDocumentFragment();

    if (!this.config.waiting || this.config.mode === SDKMode.System) {
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
   * Inserts the ONLYOFFICE Apps iframe into the DOM element identified by {@link TFrameConfig.frameId}.
   *
   * Merges `config` with {@link defaultConfig} and the instance's stored config,
   * replaces the target `<div>` with a container holding the iframe (and an optional loader),
   * attaches the `message` listener, and registers the instance in the global
   * `DocSpace.SDK.frames` registry.
   *
   * Called automatically by {@link SDK.init}. Call again to reinitialize in-place.
   *
   * @param config - Frame configuration. See {@link TFrameConfig}.
   * @returns The created `<iframe>` element, or `null` if the target element was not found.
   *
   * @example
   * ```typescript
   * const iframe = instance.initFrame({
   *   frameId: 'ds-frame',
   *   src: 'https://portal.example.com',
   *   mode: SDKMode.Viewer,
   *   id: 42,
   * });
   * ```
   *
   * @example
   * With event handlers — see {@link TFrameEvents} for the full list of available events.
   * ```typescript
   * const iframe = instance.initFrame({
   *   frameId: 'ds-editor',
   *   src: 'https://portal.example.com',
   *   mode: SDKMode.Editor,
   *   id: 42,
   *   events: {
   *     onAppReady: () => console.log('ready'),
   *     onEditorOpen: () => console.log('document opened'),
   *     onEditorCloseCallback: () => history.back(),
   *   },
   * });
   * ```
   */
  initFrame(config: TFrameConfig): HTMLIFrameElement | null {
    this.config = this.#prepareFrameConfig(config);

    if (!this.config.frameId) {
      console.warn("SDK Warning: frameId is empty. The frame may not initialize correctly.");
    }

    if (!this.config.src) {
      console.warn("SDK Warning: src is empty. The iframe will not load any content.");
    }

    try {
      this.#expectedOrigin = new URL(this.config.src).origin;
    } catch {
      this.#expectedOrigin = "";
      if (this.config.src) {
        console.warn(`SDK Warning: src "${this.config.src}" is not a valid URL.`);
      }
    }

    this.#isConnected = false;

    this.#clearAllPending(new SDKError(SDKErrorCode.Disconnected, "Frame reloaded"));

    const setupResult = this.#createContainer(this.config.frameId);

    if (!setupResult) return null;

    const { container, target } = setupResult;

    const iframe = this.#setupIframe();

    this.#iframe = iframe;
    this.#setupFrameEventHandlers(iframe);
    this.#assembleFrame(container, target, iframe);

    window.DocSpace.SDK.frames = window.DocSpace.SDK.frames || {};
    window.DocSpace.SDK.frames[this.config.frameId] = this;

    return iframe;
  }

  /**
   * Tears down the iframe and releases all resources associated with this instance.
   *
   * Replaces the container with a plain `<div>` (preserving the original `frameId` and CSS classes,
   * showing {@link TFrameConfig.destroyText}), removes the `message` listener, rejects pending
   * method calls with {@link SDKErrorCode.Disconnected}, and removes the instance from the global
   * `DocSpace.SDK.frames` registry.
   *
   * The call is synchronous and complete when it returns: the placeholder keeps the `frameId`, so
   * an `SDK.init*` call on the same `frameId` may follow immediately — there is nothing to await.
   *
   * @example
   * ```typescript
   * instance.destroyFrame();
   * ```
   *
   * @example
   * Destroy and reinitialize the same frame in a different mode using {@link SDK.initEditor}.
   * ```typescript
   * instance.destroyFrame();
   * sdk.initEditor({ frameId: 'ds-frame', src: 'https://portal.example.com', id: 99 });
   * ```
   */
  destroyFrame(): void {
    const frameId = this.config.frameId;
    const containerElement = document.getElementById(`${frameId}-container`);

    const replacementDiv = document.createElement("div");
    replacementDiv.id = frameId;
    replacementDiv.className = this.#classNames;
    replacementDiv.textContent = this.config.destroyText || "";

    if (containerElement) {
      if (containerElement.parentNode) {
        containerElement.parentNode.replaceChild(
          replacementDiv,
          containerElement
        );
      } else {
        document.body.appendChild(replacementDiv);
      }

    }

    window.removeEventListener("message", this.#onMessage);
    this.#iframe = null;

    const loaderClassName = `${frameId}-loader__element`;
    const styleEl = SDKInstance._loaderCache.style.get(loaderClassName);
    if (styleEl?.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    SDKInstance._loaderCache.style.delete(loaderClassName);

    this.#isConnected = false;

    this.#clearAllPending(new SDKError(SDKErrorCode.Disconnected, "Frame destroyed"));

    const sdkFrames = window.DocSpace?.SDK?.frames;
    if (sdkFrames && frameId in sdkFrames) {
      delete sdkFrames[frameId];
    }
  }

  /**
   * Returns a promise that resolves with the result of executing the specified method.
   *
   * @param methodName - The name of the method to execute.
   * @param params - The parameters to pass to the method. Defaults to null.
   * @returns A promise that resolves to an object containing the result of the method execution,
   *   or rejects — see `#settleMethodResult` for the error rules.
   */
  #getMethodPromise = <T extends object>(
    methodName: string,
    params: object | null = null,
  ): Promise<T> => {
    const promise = new Promise<T>((resolve, reject) => {
      this.#executeMethod(methodName, params, resolve as (data: object) => void, reject);
    });

    // Prevent unhandled rejection for integrators without .catch().
    // Errors are still reported via onAppError.
    promise.catch(() => {});

    return promise;
  };

  /**
   * Merges `config` into the stored config and sends it to the iframe.
   *
   * When `reload` is `true`, reinitializes the iframe entirely via {@link SDKInstance.initFrame}
   * instead of sending a postMessage update.
   *
   * @param config - Partial frame configuration to merge. Defaults to {@link defaultConfig}.
   * @param reload - When `true`, reinitializes the frame. Defaults to `false`.
   * @returns A promise that resolves with the iframe's response, or with the merged config if `reload` is `true`.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * await instance.setConfig({ theme: Theme.Dark, locale: 'fr-FR' });
   * ```
   *
   * @example
   * Switch to a different document while keeping existing settings —
   * read them first via {@link SDKInstance.getConfig}.
   * ```typescript
   * const current = instance.getConfig();
   * await instance.setConfig({ ...current, id: 99, mode: SDKMode.Editor }, true);
   * ```
   */
  setConfig(
    config: TFrameConfig = defaultConfig,
    reload: boolean = false
  ): Promise<object> {
    this.config = { ...this.config, ...config };

    if (config.src) {
      try {
        this.#expectedOrigin = new URL(this.config.src).origin;
      } catch {
        this.#expectedOrigin = "";
      }
    }

    if (reload) {
      this.initFrame(this.config);
      return Promise.resolve(this.config);
    }

    return this.#getMethodPromise(InstanceMethods.SetConfig, this.config);
  }

  /**
   * Returns the current merged configuration object.
   *
   * @returns The active {@link TFrameConfig} for this instance.
   *
   * @example
   * ```typescript
   * const config = instance.getConfig();
   * console.log(config.mode, config.src);
   * ```
   *
   * @example
   * Preserve existing settings when making a partial update via {@link SDKInstance.setConfig}.
   * ```typescript
   * const config = instance.getConfig();
   * await instance.setConfig({ ...config, theme: Theme.Dark });
   * ```
   */
  getConfig(): TFrameConfig {
    const config = { ...this.config };
    if (config.filter) config.filter = { ...config.filter };
    if (config.events) config.events = { ...config.events };
    if (config.editorCustomization) config.editorCustomization = { ...config.editorCustomization };
    return config;
  }

  /**
   * Returns metadata about the folder currently open in the frame.
   *
   * @returns A promise that resolves with {@link TFolderInfo}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const info = await instance.getFolderInfo();
   * console.log(info);
   * ```
   *
   * @example
   * Check write access before calling {@link SDKInstance.createFolder}.
   * ```typescript
   * const info = await instance.getFolderInfo();
   * if (info.security?.create) {
   *   await instance.createFolder(info.id, 'Archive');
   * }
   * ```
   */
  getFolderInfo(): Promise<TFolderInfo> {
    return this.#getMethodPromise<TFolderInfo>(InstanceMethods.GetFolderInfo);
  }

  /**
   * Returns the items currently selected in the frame.
   *
   * @returns A promise that resolves with an array of {@link TFileInfo}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const selection = await instance.getSelection();
   * console.log(selection);
   * ```
   *
   * @example
   * Pass the selection as context to {@link SDKInstance.openModal}.
   * ```typescript
   * const selection = await instance.getSelection();
   * if (selection.length > 0) {
   *   await instance.openModal('share', { items: selection });
   * }
   * ```
   */
  getSelection(): Promise<TFileInfo[]> {
    return this.#getMethodPromise<TFileInfo[]>(InstanceMethods.GetSelection);
  }

  /**
   * Returns the files in the folder currently open in the frame.
   *
   * @returns A promise that resolves with {@link TFilesResponse}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const files = await instance.getFiles();
   * console.log(files);
   * ```
   *
   * @example
   * Open the first file in viewer mode via {@link SDKInstance.setConfig}.
   * ```typescript
   * const files = await instance.getFiles();
   * if (files.files[0]) {
   *   await instance.setConfig({ id: files.files[0].id, mode: SDKMode.Viewer }, true);
   * }
   * ```
   */
  getFiles(): Promise<TFilesResponse> {
    return this.#getMethodPromise<TFilesResponse>(InstanceMethods.GetFiles);
  }

  /**
   * Returns the subfolders of the folder currently open in the frame.
   *
   * @returns A promise that resolves with {@link TFilesResponse}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const folders = await instance.getFolders();
   * console.log(folders);
   * ```
   *
   * @example
   * Navigate into the first subfolder via {@link SDKInstance.setConfig}.
   * ```typescript
   * const folders = await instance.getFolders();
   * if (folders.folders[0]) {
   *   await instance.setConfig({ id: folders.folders[0].id }, true);
   * }
   * ```
   */
  getFolders(): Promise<TFilesResponse> {
    return this.#getMethodPromise<TFilesResponse>(InstanceMethods.GetFolders);
  }

  /**
   * Returns all files and folders in the folder currently open in the frame.
   *
   * Use {@link SDKInstance.getFiles} or {@link SDKInstance.getFolders}
   * when you need only one content type.
   *
   * @returns A promise that resolves with {@link TFilesResponse}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const list = await instance.getList();
   * console.log(list);
   * ```
   *
   * @example
   * ```typescript
   * const list = await instance.getList();
   * console.log('Files:', list.files.length, 'Folders:', list.folders.length);
   * ```
   */
  getList(): Promise<TFilesResponse> {
    return this.#getMethodPromise<TFilesResponse>(InstanceMethods.GetList);
  }

  /**
   * Returns a list of rooms, filtered by `filter`.
   *
   * @param filter - Filter and sort criteria. See {@link TFrameFilter}.
   * @returns A promise that resolves with {@link TRoomsResponse}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const rooms = await instance.getRooms({
   *   search: 'alpha',
   *   sortBy: FilterSortBy.Name,
   *   sortOrder: FilterSortOrder.Ascending,
   * });
   * console.log(rooms);
   * ```
   *
   * @example
   * Find rooms and remove an outdated tag from each using {@link SDKInstance.removeTagsFromRoom}.
   * ```typescript
   * const rooms = await instance.getRooms({ search: 'sprint-22' });
   * for (const room of rooms.folders) {
   *   await instance.removeTagsFromRoom(room.id, ['in-progress']);
   * }
   * ```
   */
  getRooms(filter: TFrameFilter): Promise<TRoomsResponse> {
    return this.#getMethodPromise<TRoomsResponse>(InstanceMethods.GetRooms, filter);
  }

  /**
   * Returns information about the currently authenticated user.
   *
   * @returns A promise that resolves with {@link TUserInfo}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const user = await instance.getUserInfo();
   * console.log(user);
   * ```
   *
   * @example
   * Apply the user's preferred locale via {@link SDKInstance.setConfig}.
   * ```typescript
   * const user = await instance.getUserInfo();
   * if (user.cultureName) {
   *   await instance.setConfig({ locale: user.cultureName });
   * }
   * ```
   */
  getUserInfo(): Promise<TUserInfo> {
    return this.#getMethodPromise<TUserInfo>(InstanceMethods.GetUserInfo);
  }

  /**
   * Returns the server's password hash settings needed by {@link SDKInstance.createHash}.
   *
   * @returns A promise that resolves with {@link THashSettings}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const settings = await instance.getHashSettings();
   * console.log(settings);
   * ```
   *
   * @example
   * Full authentication flow using {@link SDKInstance.createHash} and {@link SDKInstance.login}.
   * ```typescript
   * const settings = await instance.getHashSettings();
   * const hash = await instance.createHash('p@ssw0rd', settings);
   * await instance.login('user@example.com', hash);
   * ```
   */
  getHashSettings(): Promise<THashSettings> {
    return this.#getMethodPromise<THashSettings>(InstanceMethods.GetHashSettings);
  }
  
  /**
   * Opens a modal dialog of the specified type inside the frame.
   *
   * @param type - The modal type identifier.
   * @param options - Modal-specific configuration options.
   * @returns A promise that resolves with the modal result.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const result = await instance.openModal('invite', { roomId: 42 });
   * console.log(result);
   * ```
   *
   * @example
   * Open a share dialog for the items currently selected in the frame using {@link SDKInstance.getSelection}.
   * ```typescript
   * const selection = await instance.getSelection();
   * if (selection.length > 0) {
   *   await instance.openModal('share', { items: selection });
   * }
   * ```
   */
  openModal(type: string, options: object): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.OpenModal, { type, options });
  }
  
  /**
   * Creates a new file in the specified folder.
   *
   * @param folderId - The ID of the target folder.
   * @param title - The file title. An extension is optional: `"Report.docx"` keeps it, `"Report"` gets `.docx` from the portal.
   * @param templateId - The ID of a file to copy the content from. Omit for an empty document.
   * @param formId - The ID of a form to create the file from. Omit when the file is not based on a form.
   * @returns A promise that resolves with {@link TFileInfo}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const file = await instance.createFile('folder-123', 'Project Proposal');
   * console.log(file);
   * ```
   *
   * @example
   * Create a file from a template and immediately open it in the editor using {@link SDKInstance.setConfig}.
   * ```typescript
   * const file = await instance.createFile('folder-123', 'Report.docx', 'template-456');
   * await instance.setConfig({ id: file.id, mode: SDKMode.Editor }, true);
   * ```
   */
  createFile(
    folderId: string,
    title: string,
    templateId?: string,
    formId?: string
  ): Promise<TFileInfo> {
    return this.#getMethodPromise<TFileInfo>(InstanceMethods.CreateFile, {
      folderId,
      title,
      ...(templateId !== undefined && { templateId }),
      ...(formId !== undefined && { formId }),
    });
  }
  
  /**
   * Creates a new folder inside the specified parent folder.
   *
   * @param parentFolderId - The ID of the parent folder.
   * @param title - The folder title.
   * @returns A promise that resolves with {@link TFolderInfo}.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const folder = await instance.createFolder('parent-123', 'Archive');
   * console.log(folder);
   * ```
   *
   * @example
   * Create a folder and immediately add a file inside it using {@link SDKInstance.createFile}.
   * ```typescript
   * const folder = await instance.createFolder('parent-123', 'Q1 Reports');
   * await instance.createFile(folder.id, 'Summary');
   * ```
   */
  createFolder(parentFolderId: string, title: string): Promise<TFolderInfo> {
    return this.#getMethodPromise<TFolderInfo>(InstanceMethods.CreateFolder, {
      parentFolderId,
      title,
    });
  }

  /**
   * Creates a new room with the given type and optional settings.
   *
   * :::note
   * The room type decides which access levels the room accepts: reviewing and commenting exist only in
   * {@link RoomType.Custom}; a {@link RoomType.Collaboration} room offers editing and reading only.
   * Creating a room requires the room admin role on the portal; a user without it gets a `403` result.
   * :::
   *
   * @param title - The room display name.
   * @param roomType - The room type: a {@link RoomType} value or its numeric API value (`1` form filling, `2` collaboration, `5` custom, `6` public, `8` virtual data, `9` AI).
   * @param options - Optional room settings. See {@link TCreateRoomOptions}.
   * @returns A promise that resolves with {@link TRoomInfo}, or with `{ status, message }` when the portal
   *   reports a failure — unlike the other methods, `createRoom` does not reject on portal errors.
   *
   * @example
   * ```typescript
   * const room = await instance.createRoom('Design Team', RoomType.Collaboration, { tags: ['design'] });
   * console.log(room);
   * ```
   *
   * @example
   * Create a room, then create a new tag and apply it using {@link SDKInstance.createTag}
   * and {@link SDKInstance.addTagsToRoom}.
   * ```typescript
   * const room = await instance.createRoom('Marketing', RoomType.Custom);
   * await instance.createTag('campaigns');
   * await instance.addTagsToRoom(room.id, ['campaigns']);
   * ```
   */
  createRoom(
    title: string,
    roomType: string | number,
    options?: TCreateRoomOptions
  ): Promise<TRoomInfo> {
    return this.#getMethodPromise<TRoomInfo>(InstanceMethods.CreateRoom, {
      title,
      roomType,
      ...options,
    });
  }  
  
  /**
   * Switches the file list display mode.
   *
   * @param viewType - The view mode: `"row"`, `"table"`, or `"tile"`.
   * @returns A promise that resolves with the result of the operation.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * await instance.setListView('table');
   * ```
   *
   * @example
   * Switch to tile view only when in manager mode — read the current mode via {@link SDKInstance.getConfig}.
   * ```typescript
   * const { mode } = instance.getConfig();
   * if (mode === SDKMode.Manager) {
   *   await instance.setListView('tile');
   * }
   * ```
   */
  setListView(viewType: TManagerViewMode): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.SetListView, { viewType });
  }

  /**
   * Creates a password hash using the provided hash settings.
   *
   * Obtain `hashSettings` from {@link SDKInstance.getHashSettings} before calling this method.
   *
   * @param password - The plaintext password to hash.
   * @param hashSettings - Hash algorithm settings from {@link SDKInstance.getHashSettings}.
   * @returns A promise that resolves with the generated hash.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const settings = await instance.getHashSettings();
   * const hash = await instance.createHash('p@ssw0rd', settings);
   * console.log(hash);
   * ```
   *
   * @example
   * Full login flow using {@link SDKInstance.getHashSettings} and {@link SDKInstance.login}.
   * ```typescript
   * const settings = await instance.getHashSettings();
   * const hash = await instance.createHash('p@ssw0rd', settings);
   * await instance.login('user@example.com', hash, undefined, true);
   * ```
   */
  createHash(password: string, hashSettings: object): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateHash, {
      password,
      hashSettings,
    });
  }

  /**
   * Authenticates a user using email and a hashed password.
   *
   * Obtain `passwordHash` from {@link SDKInstance.createHash}. The portal's SDK dispatcher
   * (client 4.0.0) forwards only `email` and `passwordHash` to its sign-in and always requests a
   * persistent session; the REST endpoint behind it would also take a plaintext password and a
   * session flag, but neither reaches it from the frame.
   *
   * :::note
   * A failed sign-in is **resolved, not rejected** — see {@link TLoginResult}. `url === "/"` means a
   * session exists; a `url` under `/confirm/` means the account needs a second factor and no
   * session was created — call `login` again with the same credentials and the one-time `code`;
   * a `status` (`401` for wrong credentials) with a `message` means the attempt failed. Only SDK-side
   * failures reject: {@link SDKErrorCode.Timeout}, {@link SDKErrorCode.Disconnected},
   * {@link SDKErrorCode.ModeMismatch}. A portal whose SDK dispatcher predates the `code`
   * argument ignores it and answers the challenge again; on such a portal the login page remains
   * the only way to complete a two-factor sign-in.
   * :::
   *
   * @param email - The user's email address.
   * @param passwordHash - The hashed password (from {@link SDKInstance.createHash}).
   * @param password - Not forwarded by the portal's SDK dispatcher (client 4.0.0); use `passwordHash`.
   * @param session - Not forwarded by the portal's SDK dispatcher (client 4.0.0); the session is always persistent.
   * @param code - One-time code from the authenticator app or SMS; finishes a login that answered with a `/confirm/…` url.
   * @returns A promise that resolves with the authentication result — see {@link TLoginResult}.
   *   Unlike the other methods, a portal failure is resolved as `{ status, message }`, not rejected.
   *
   * @example
   * Login with a pre-hashed password from {@link SDKInstance.createHash}.
   * ```typescript
   * const result = await instance.login('user@example.com', passwordHash);
   * if (result.status) throw new Error(result.message ?? 'login failed');
   * ```
   *
   * @example
   * Two-factor sign-in using {@link SDKInstance.getHashSettings} and {@link SDKInstance.createHash}.
   * ```typescript
   * const settings = await instance.getHashSettings();
   * const hash = await instance.createHash('p@ssw0rd', settings);
   * const first = await instance.login('user@example.com', hash);
   * if (first.url?.startsWith('/confirm/')) {
   *   const code = await askUserForCode();
   *   const second = await instance.login('user@example.com', hash, undefined, undefined, code);
   *   if (second.status) throw new Error('wrong code');
   * }
   * ```
   */
  login(
    email: string,
    passwordHash: string,
    password?: string,
    session?: boolean,
    code?: string
  ): Promise<TLoginResult> {
    return this.#getMethodPromise(InstanceMethods.Login, {
      email,
      passwordHash,
      ...(password !== undefined && { password }),
      ...(session !== undefined && { session }),
      ...(code !== undefined && { code }),
    });
  }

  /**
   * Ends the current user session.
   *
   * @returns A promise that resolves with the logout result.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * await instance.logout();
   * ```
   *
   * @example
   * Log out and immediately authenticate as a different user using {@link SDKInstance.getHashSettings},
   * {@link SDKInstance.createHash}, and {@link SDKInstance.login}.
   * ```typescript
   * await instance.logout();
   * const settings = await instance.getHashSettings();
   * const hash = await instance.createHash('newpassword', settings);
   * await instance.login('other@example.com', hash);
   * ```
   */
  logout(): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.Logout);
  }
  
  /**
   * Creates a new tag with the given name.
   *
   * @param name - The tag name.
   * @returns A promise that resolves with the created tag data.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * const tag = await instance.createTag('Project Alpha');
   * console.log(tag);
   * ```
   *
   * @example
   * Create a tag and immediately apply it to a room using {@link SDKInstance.addTagsToRoom}.
   * ```typescript
   * await instance.createTag('archived');
   * await instance.addTagsToRoom('room-123', ['archived']);
   * ```
   */
  createTag(name: string): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.CreateTag, { name });
  }
  
  /**
   * Adds the specified tags to a room.
   *
   * @param roomId - The room ID.
   * @param tags - Tag names to add.
   * @returns A promise that resolves with the result of the operation.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * await instance.addTagsToRoom('room-123', ['design', 'q1']);
   * ```
   *
   * @example
   * Create a new tag with {@link SDKInstance.createTag} and apply it
   * to a newly created room via {@link SDKInstance.createRoom}.
   * ```typescript
   * await instance.createTag('design');
   * const room = await instance.createRoom('Creative Hub', RoomType.Collaboration);
   * await instance.addTagsToRoom(room.id, ['design']);
   * ```
   */
  addTagsToRoom(roomId: string, tags: string[]): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.AddTagsToRoom, {
      roomId,
      tags,
    });
  }
  
  /**
   * Removes the specified tags from a room.
   *
   * @param roomId - The room ID.
   * @param tags - Tag names to remove.
   * @returns A promise that resolves with the result of the operation.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure.
   *
   * @example
   * ```typescript
   * await instance.removeTagsFromRoom('room-123', ['draft', 'in-progress']);
   * ```
   *
   * @example
   * Find rooms by name and clean up a tag from each using {@link SDKInstance.getRooms}.
   * ```typescript
   * const rooms = await instance.getRooms({ search: 'sprint-22' });
   * for (const room of rooms.folders) {
   *   await instance.removeTagsFromRoom(room.id, ['in-progress']);
   * }
   * ```
   */
  removeTagsFromRoom(roomId: string, tags: string[]): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.RemoveTagsFromRoom, {
      roomId,
      tags,
    });
  }
  
  /**
   * Runs a callback function inside the active document editor.
   *
   * Only meaningful when the frame is in {@link SDKMode.Editor} or {@link SDKMode.Viewer} mode.
   *
   * The callback is serialized with `Function.prototype.toString` and re-created inside the
   * editor frame, so it must not reference outer-scope variables, closures or imports — pass
   * everything it needs through `data`. The editor frame invokes it as
   * `callback(editor, asc, data)`:
   *
   * - `editor` — the DocsAPI editor object (`window.DocEditor.instances[...]`). Call
   *   `editor.createConnector()` yourself to get a connector with `callCommand` /
   *   `executeMethod`; the SDK does not create one for you.
   * - `asc` — `window.Asc` of the editor frame. `asc.scope` is serialized into every
   *   `connector.callCommand(fn)` and is the way to pass data into Document Builder code.
   * - `data` — the `data` argument of this method, JSON-serialized.
   *
   * @param callback - The function to run inside the editor context. Invoked as
   *   `callback(editor, asc, data)` — note that `data` is the **third** argument.
   * @param data - Optional JSON-serializable data passed as the third argument to `callback`.
   *
   * @example
   * ```typescript
   * instance.executeInEditor((editor, _asc, data) => {
   *   editor.insertText(data.text);
   * }, { text: 'Hello, World!' });
   * ```
   *
   * @example
   * Initialize editor mode with {@link SDK.initEditor} and inject content when the document is ready.
   * ```typescript
   * const instance = sdk.initEditor({
   *   frameId: 'ds-editor',
   *   src: 'https://portal.example.com',
   *   id: 42,
   *   events: {
   *     onEditorOpen: () => {
   *       instance.executeInEditor((editor, _asc, data) => {
   *         editor.insertText(data.header);
   *       }, { header: 'Generated by SDK' });
   *     },
   *   },
   * });
   * ```
   *
   * @example
   * Fill form fields with the Document Builder API through a connector. Data reaches the
   * `callCommand` function via `Asc.scope`; the function itself must be closure-free.
   * ```typescript
   * instance.executeInEditor(function (editor, asc, data) {
   *   const connector = editor.createConnector();
   *   asc.scope = { values: data.values };
   *   connector.callCommand(function () {
   *     const doc = Api.GetDocument();
   *     for (const form of doc.GetAllForms()) {
   *       const value = Asc.scope.values[form.GetFormKey()];
   *       if (value === undefined) continue;
   *       if (form.GetFormType() === 'checkBoxForm') form.SetChecked(!!value);
   *       else form.SetText(String(value));
   *     }
   *   });
   * }, { values: { FullName: 'Jane Doe', Agree: true } });
   * ```
   */
  executeInEditor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (editor: any, asc: any, data?: any) => void,
    data?: object,
  ): Promise<object> {
    return this.#getMethodPromise(InstanceMethods.ExecuteInEditor, {
      callback, data
    });
  }

  /**
   * Navigates the frame to a specific section.
   * Works in {@link SDKMode.Forms} and {@link SDKMode.Personal} modes.
   *
   * @param section - Target section. For {@link SDKMode.Forms} — {@link TFormsSection};
   *   for {@link SDKMode.Personal} — {@link TPersonalSection}.
   * @returns A promise that resolves when the navigation is complete.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure,
   *   or with {@link SDKErrorCode.ModeMismatch} in any other mode.
   *
   * @example
   * Forms mode.
   * ```typescript
   * await instance.navigateSection("completed-forms");
   * ```
   *
   * @example
   * Personal mode.
   * ```typescript
   * const personal = sdk.initPersonal({
   *   frameId: 'ds-personal',
   *   src: 'https://portal.example.com',
   * });
   * await personal.navigateSection("trash");
   * ```
   */
  navigateSection(section: TFormsSection | TPersonalSection): Promise<object> {
    if (this.config.mode !== SDKMode.Forms && this.config.mode !== SDKMode.Personal) {
      return this.#rejectModeMismatch("navigateSection is only available in Forms or Personal mode");
    }

    return this.#getMethodPromise(InstanceMethods.NavigateSection, { section });
  }

  /**
   * Registers custom context menu actions for files and/or folders.
   * Only works in {@link SDKMode.Forms} mode.
   * When a custom action is clicked, {@link TFrameEvents.onCustomAction} fires with the action key and item data.
   *
   * @param config - Custom actions configuration. See {@link TCustomActionsConfig}.
   * @returns A promise that resolves when actions are registered.
   *   Rejects with {@link SDKError} ({@link SDKErrorCode.ApiError}) when the portal reports a failure,
   *   or with {@link SDKErrorCode.ModeMismatch} in any other mode.
   *
   * @example
   * ```typescript
   * await instance.setCustomActions({
   *   contextMenu: {
   *     file: [
   *       { key: "send-to-crm", label: "Send to CRM", icon: "https://example.com/icon.svg" },
   *       { key: "export", label: "Export", section: ["completed-forms"] },
   *     ],
   *   },
   * });
   * ```
   *
   * @example
   * Handle the custom action event on the host page.
   * ```typescript
   * const forms = sdk.initForms({
   *   frameId: 'ds-forms',
   *   src: 'https://portal.example.com',
   *   id: 'room-42',
   *   events: {
   *     onCustomAction: (data) => console.log('action:', data),
   *   },
   * });
   * await forms.setCustomActions({
   *   contextMenu: { file: [{ key: "approve", label: "Approve" }] },
   * });
   * ```
   */
  setCustomActions(config: TCustomActionsConfig): Promise<object> {
    if (this.config.mode !== SDKMode.Forms) {
      return this.#rejectModeMismatch("setCustomActions is only available in Forms mode");
    }

    return this.#getMethodPromise(InstanceMethods.SetCustomActions, config);
  }

  /**
   * Uploads a file into the frame's current location: the form filling room in
   * {@link SDKMode.Forms}, the open folder in {@link SDKMode.Personal}.
   * The file is transferred to the iframe via zero-copy ArrayBuffer and uploaded
   * using the chunked upload API. The file list refreshes automatically when complete.
   *
   * @param file - The file to upload. Callers should validate type and size before calling.
   * @returns A promise that resolves with the payload of {@link TFrameEvents.onUploadSuccess}
   *   (`{ fileName, fileSize, uploadId }`), so a handler for that event is optional. Rejects with
   *   {@link SDKError}: {@link SDKErrorCode.UploadFailed} when the frame reports
   *   {@link TFrameEvents.onUploadError} or the transfer exceeds 120 seconds,
   *   {@link SDKErrorCode.ModeMismatch} in any other mode, {@link SDKErrorCode.Disconnected}
   *   before the frame is connected.
   *
   * :::note
   * The entire file is read into memory via `arrayBuffer()` before transfer.
   * Callers should validate file size before invoking this method to avoid
   * excessive memory usage on the host page. The server-side upload limit
   * is configured in ONLYOFFICE Apps and will reject files that exceed it.
   *
   * The ArrayBuffer is transferred to the iframe (zero-copy). After `upload()`
   * returns, the buffer is neutered and cannot be reused.
   *
   * The transfer has its own 120-second timeout; {@link TFrameConfig.methodTimeout} does not apply.
   * {@link TFrameEvents.onUploadProgress} is not emitted for `upload()` — the frame reports only
   * success or failure.
   * :::
   *
   * @example
   * ```typescript
   * const input = document.querySelector("input[type=file]");
   * const file = input.files[0];
   * const result = await instance.upload(file);
   * ```
   *
   * @example
   * Upload with error handling.
   * ```typescript
   * try {
   *   await forms.upload(file);
   *   console.log("Upload complete");
   * } catch (err) {
   *   console.error("Upload failed:", err.message);
   * }
   * ```
   */
  async upload(file: File): Promise<object> {
    if (this.config.mode !== SDKMode.Forms && this.config.mode !== SDKMode.Personal) {
      return this.#rejectModeMismatch("upload is only available in Forms or Personal mode");
    }

    if (!this.#isConnected) {
      const err = new SDKError(SDKErrorCode.Disconnected, connectErrorText);
      this.#handleError(err);
      throw err;
    }

    const { frameId, src } = this.config;

    if (!this.#iframe?.contentWindow) {
      throw new SDKError(SDKErrorCode.Disconnected, "Frame not connected");
    }

    const buffer = await file.arrayBuffer();

    const uploadId = ++this.#uploadIdCounter;

    const uploadPromise = new Promise<object>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pendingUploads.delete(uploadId);
        reject(new SDKError(SDKErrorCode.UploadFailed, `Upload timed out: ${file.name}`));
      }, 120000);

      this.#pendingUploads.set(uploadId, { fileName: file.name, resolve, reject, timer });
    });

    this.#iframe!.contentWindow!.postMessage(
      {
        frameId,
        type: MessageTypes.UploadFileData,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        buffer,
      },
      src,
      [buffer],
    );

    return uploadPromise;
  }
}
