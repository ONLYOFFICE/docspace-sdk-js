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

import { cspErrorText, CSPApiUrl, defaultConfig } from "../constants";
import type { TFrameConfig } from "../types";
import { SDKMode } from "../enums";

/**
 * Converts a record of primitive values into a URL query string.
 * Strips `null` and `undefined` entries before serialization.
 *
 * Used internally by {@link getFramePath} to build iframe `src` query parameters.
 *
 * @param data - Key-value pairs to serialize. `null`/`undefined` values are removed.
 * @returns A URL-encoded query string (without the leading `?`), or `""` if `data` is falsy.
 *
 * @example
 * ```typescript
 * customUrlSearchParams({ theme: "Dark", locale: null, page: 1 });
 * // → "theme=Dark&page=1"
 * ```
 *
 * @internal
 */
export const customUrlSearchParams = (
  data: Record<string, string | number | boolean | undefined | null>
) => {
  if (!data) return "";

  Object.keys(data).forEach(
    (key) => (data[key] === undefined || data[key] === null) && delete data[key]
  );

  return new URLSearchParams(data as Record<string, string>).toString();
};

/**
 * Checks whether the current host domain is in the DocSpace CSP allowlist.
 *
 * Fetches `{targetSrc}{@link CSPApiUrl}` and compares `window.location.host`
 * against the `domains` array in the JSON response. If the host is not listed,
 * throws an error with {@link cspErrorText}.
 *
 * Skipped when `window.location.origin` already contains `targetSrc`
 * (same-origin embedding).
 *
 * Called by `SDKInstance.initFrame` when {@link TFrameConfig.checkCSP} is `true`.
 *
 * @param targetSrc - The DocSpace server URL (e.g. `"https://docspace.example.com"`).
 * @returns Resolves on success; rejects with an `Error` on failure.
 *
 * @throws `Error` — if the CSP response cannot be parsed as JSON.
 * @throws `Error` — with {@link cspErrorText} if the current host is not in the allowlist.
 *
 * @internal
 */
export const validateCSP = async (targetSrc: string) => {
  const { origin, host } = window.location;

  if (origin.includes(targetSrc)) return;

  const response = await fetch(`${targetSrc}${CSPApiUrl}`);

  let json;

  try {
    json = await response.json();
  } catch (error) {
    throw new Error(`CSP validation failed: ${error}`);
  }

  const {
    response: { domains },
  } = json;

  const currentSrcHost = host || new URL(origin).host;

  const normalizedDomains = domains.map((domain: string) => {
    try {
      const url = new URL(domain.toLowerCase());
      return url.host + (url.pathname !== "/" ? url.pathname : "");
    } catch {
      return domain;
    }
  });

  if (!normalizedDomains.includes(currentSrcHost.toLowerCase())) {
    throw new Error(cspErrorText);
  }
};

/**
 * Returns an HTML string for the CSP error page displayed inside the iframe
 * via `srcdoc` when {@link validateCSP} fails.
 *
 * The page shows the DocSpace logo, an error illustration, {@link cspErrorText},
 * and a link to the Developer Tools section where the domain can be added.
 *
 * @param src - The DocSpace server URL used to resolve static image assets and the Developer Tools link.
 * @returns A complete `<body>` HTML string ready for iframe `srcdoc`.
 *
 * @internal
 */
export const getCSPErrorBody = (src: string) => {
  const safeSrc = src
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<body style="background:#f3f4f4"><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300" rel="stylesheet"><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style="flex-shrink:0;position:relative"><img src="${safeSrc}/static/images/logo/lightsmall.svg"></div><div style="display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative"><div style="flex-shrink:0;width:120px;height:100px;position:relative"><img src="${safeSrc}/static/images/frame-error.svg"></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href="${safeSrc}/developer-tools/javascript-sdk" style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline" target="_blank">the Developer Tools section</a>.</span></div></div></body>`;
};

/**
 * Returns a CSS string for the spinning loader animation injected into the
 * iframe container while the DocSpace app is loading.
 *
 * Features:
 * - Dark/light mode via `prefers-color-scheme`.
 * - Reduced motion support via `prefers-reduced-motion` (slows animation to 1.5 s).
 *
 * The loader is created by `SDKInstance.initFrame` when {@link TFrameConfig.noLoader} is `false`
 * and removed by `SDKInstance.setIsLoaded`.
 *
 * @param className - The CSS class name applied to the loader `<div>`. Used to scope the styles.
 * @returns A `<style>`-ready CSS string (without `<style>` tags).
 *
 * @internal
 */
export const getLoaderStyle = (className: string) => {
  return `@keyframes rotate { 0%{ transform: rotate(-45deg); will-change: transform; } 15%{ transform: rotate(45deg); } 30%{ transform: rotate(135deg); } 45%{ transform: rotate(225deg); } 60%, 100%{ transform: rotate(315deg); } } .${className} { width: 74px; height: 74px; border: 4px solid rgba(51,51,51, 0.1); border-top-color: #333333; border-radius: 50%; transform: rotate(-45deg); position: relative; box-sizing: border-box; animation: 1s linear infinite rotate; will-change: transform; } @media (prefers-color-scheme: dark) { .${className} { border-color: rgba(204, 204, 204, 0.1); border-top-color: #CCCCCC; } } @media (prefers-reduced-motion: reduce) { .${className} { animation-duration: 1.5s; } }`;
};

/**
 * Parses the current `<script>` element's URL query parameters into a {@link TFrameConfig} object.
 *
 * Designed for the **script-tag embedding** pattern where the SDK is loaded via a
 * `<script src="...sdk.js?src=https://docspace.example.com&mode=manager&...">` tag.
 * The function reads `document.currentScript.src`, decodes it, and merges the
 * query parameters on top of {@link defaultConfig}.
 *
 * Boolean strings `"true"` / `"false"` are converted to actual booleans.
 * Parameters whose keys match {@link TFrameConfig.filter | filter} fields
 * (e.g. `sortBy`, `sortOrder`, `count`) are placed inside `config.filter`.
 *
 * @returns A complete {@link TFrameConfig} with parsed overrides, or `null` if no `src` parameter is present.
 *
 * @example
 * ```html
 * <div id="ds-frame"></div>
 * <script src="https://cdn.example.com/sdk.js?src=https://docspace.example.com&mode=manager&showMenu=true"></script>
 * ```
 *
 * ```typescript
 * const config = getConfigFromParams();
 * // config.src  → "https://docspace.example.com"
 * // config.mode → "manager"
 * // config.showMenu → true
 * ```
 */
export const getConfigFromParams = (): TFrameConfig | null => {
  const scriptElement = document.currentScript as HTMLScriptElement;
  const searchParams = new URL(decodeURIComponent(scriptElement.src))
    .searchParams;

  const configTemplate: TFrameConfig = { ...defaultConfig };

  type TFilterParams = Record<string, string | number | boolean>;

  searchParams.forEach((value, key) => {
    const parsedValue =
      value === "true" ? true : value === "false" ? false : value;
    if (defaultConfig.filter && key in defaultConfig.filter) {
      (configTemplate.filter as TFilterParams)[key] = parsedValue;
    } else {
      (configTemplate as unknown as TFilterParams)[key] = parsedValue;
    }
  });

  // Ensure default values for mode and src
  configTemplate.mode = searchParams.get("mode") || "manager";
  configTemplate.src = searchParams.get("src") || "";

  return configTemplate;
};

/**
 * Builds the iframe URL path (without the origin) for the given {@link TFrameConfig}.
 *
 * The returned path is appended to {@link TFrameConfig.src} to form the full iframe `src`.
 * Each {@link SDKMode} produces a different base path and query string:
 *
 * | Mode | Base path | Key parameters |
 * |------|-----------|----------------|
 * | {@link SDKMode.Manager} | `{rootPath}` | `filter.*`, `requestToken` |
 * | {@link SDKMode.RoomSelector} | `/sdk/room-selector` | `theme`, `locale`, selector options |
 * | {@link SDKMode.FileSelector} | `/sdk/file-selector` | `selectorType`, `filterParam`, selector options |
 * | {@link SDKMode.PublicRoom} | `/sdk/public-room` | `requestToken`, `showFilter`, `showHeader` |
 * | {@link SDKMode.System} | `/old-sdk/system` | `theme`, `locale` |
 * | {@link SDKMode.Editor} | `/doceditor` | `fileId`, `editorType`, `share` |
 * | {@link SDKMode.Viewer} | `/doceditor` | `fileId`, `editorType`, `action=view` |
 * | {@link SDKMode.Uploader} | `/sdk/uploader` | `targetId`, `acceptExtensions`, size limits |
 * | {@link SDKMode.Forms} | `/sdk/forms/my-forms` | `roomId`, `libraryId`, `showMenu`, `providerName` |
 * | {@link SDKMode.Chat} | `/sdk/chat` | `agentId`, `fileId`, `chatId`, `providerName` |
 * | _(unknown)_ | `{rootPath}` or `"/"` | — |
 *
 * @param config - The frame configuration. At minimum, {@link TFrameConfig.mode} must be set.
 * @returns A URL path string (e.g. `"/sdk/room-selector?theme=Dark&locale=en-US"`).
 *
 * @example
 * ```typescript
 * const path = getFramePath({ ...defaultConfig, mode: SDKMode.System, theme: Theme.Dark });
 * // → "/old-sdk/system?theme=Dark"
 * ```
 *
 * @internal
 */
export const getFramePath = (config: TFrameConfig) => {
  const baseFrameOptions = {
    theme: config.theme,
    locale: config.locale,
  };

  const baseSelectorOptions = {
    acceptLabel: config.acceptButtonLabel,
    cancel: config.showSelectorCancel,
    cancelLabel: config.cancelButtonLabel,
    header: config.showSelectorHeader,
    roomType: config.roomType,
    search: config.withSearch,
  };

  const baseEditorOptions = {
    isSDK: true,
    fileId:
      !config.id || config.id === "undefined" || config.id === "null"
        ? -1
        : config.id,
    editorType: config.editorType,
    share: config.requestToken ? config.requestToken : undefined,
    is_file: config.requestToken ? true : undefined,
    editorGoBack:
      config.events?.onEditorCloseCallback &&
      typeof config.events.onEditorCloseCallback === "function"
        ? "event"
        : config.editorGoBack
        ? config.editorGoBack
        : undefined,
  };

  switch (config.mode) {
    case SDKMode.Manager: {
      if (config.id) config.filter!.folder = config.id as string;

      const params = config.requestToken
        ? { key: config.requestToken, ...config.filter }
        : config.filter;

      if (!params?.withSubfolders) {
        delete params?.withSubfolders;
      }

      const urlParams = customUrlSearchParams(params!);

      return `${config.rootPath}${
        config.requestToken
          ? `?${urlParams}`
          : `${config.id ? config.id + "/" : ""}filter?${urlParams}`
      }`;
    }

    case SDKMode.RoomSelector: {
      const roomSelectorConfig = {
        ...baseFrameOptions,
        ...baseSelectorOptions,
      };

      const urlParams = customUrlSearchParams(roomSelectorConfig);

      return `/sdk/room-selector${urlParams ? `?${urlParams}` : ""}`;
    }

    case SDKMode.FileSelector: {
      const fileSelectorConfig = {
        ...baseFrameOptions,
        ...baseSelectorOptions,
        breadCrumbs: config.withBreadCrumbs,
        filter: config.filterParam,
        id: config.id,
        selectorType: config.selectorType,
        subtitle: config.withSubtitle,
      };

      const urlParams = customUrlSearchParams(fileSelectorConfig);

      return `/sdk/file-selector${urlParams ? `?${urlParams}` : ""}`;
    }

    case SDKMode.PublicRoom: {
      const publicRoomConfig = {
        ...baseFrameOptions,
        folder: config.id,
        key: config.requestToken,
        showFilter: config.showFilter,
        showHeader: config.showHeader,
        showTitle: config.showTitle,
      };

      const urlParams = customUrlSearchParams(publicRoomConfig);

      return `/sdk/public-room${urlParams ? `?${urlParams}` : ""}`;
    }

    case SDKMode.System: {
      const urlParams = customUrlSearchParams(baseFrameOptions);
      return `/old-sdk/system${urlParams ? `?${urlParams}` : ""}`;
    }

    case SDKMode.Editor: {
      const editorConfig = {
        ...baseFrameOptions,
        ...baseEditorOptions,
      };

      const urlParams = customUrlSearchParams(editorConfig);

      const path = `/doceditor${urlParams ? `?${urlParams}` : ""}`;

      return path;
    }

    case SDKMode.Viewer: {
      const viewerConfig = {
        ...baseFrameOptions,
        ...baseEditorOptions,
        action: "view",
      };

      const urlParams = customUrlSearchParams(viewerConfig);

      const path = `/doceditor${urlParams ? `?${urlParams}` : ""}`;

      return path;
    }

    case SDKMode.Uploader: {
      const uploaderConfig = {
        ...baseFrameOptions,
        targetId: config.id,
        acceptExtensions: config.acceptExtensions,
        linkMainText: config.linkMainText,
        secondaryText: config.secondaryText,
        extensionsText: config.extensionsText,
        isFolderUpload: config.isFolderUpload,
        isMultipleUpload: config.isMultipleUpload,
        maxPerUploadSize: config.maxPerUploadSize,
        maxTotalUploadSize: config.maxTotalUploadSize,
      };

      const urlParams = customUrlSearchParams(uploaderConfig);

      return `/sdk/uploader${urlParams ? `?${urlParams}` : ""}`;
    }

    case SDKMode.Forms: {
      const formsConfig = {
        ...baseFrameOptions,
        roomId: config.id,
        libraryId: config.libraryId,
        showMenu: config.showMenu,
        providerName: config.providerName,
        inviteKey: config.inviteKey,
        emplType: config.emplType,
        uid: config.uid,
      };

      const urlParams = customUrlSearchParams(formsConfig);

      return `/sdk/forms/my-forms${urlParams ? `?${urlParams}` : ""}`;
    }

    case SDKMode.Chat: {
      const chatConfig = {
        ...baseFrameOptions,
        agentId: config.agentId,
        fileId: config.fileId || undefined,
        chatId: config.chatId || undefined,
        providerName: config.providerName || undefined,
        inviteKey: config.inviteKey || undefined,
        emplType: config.emplType || undefined,
        uid: config.uid || undefined,
      };

      const urlParams = customUrlSearchParams(chatConfig);

      return `/sdk/chat${urlParams ? `?${urlParams}` : ""}`;
    }

    default:
      return config.rootPath || "/";
  }
};
