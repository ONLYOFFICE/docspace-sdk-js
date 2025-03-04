/**
 * (c) Copyright Ascensio System SIA 2024
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
 * Converts an object with string, number, or boolean values into URLSearchParams.
 *
 * @param data - An object where the keys are strings and the values are either strings, numbers, or booleans.
 * @returns A new instance of URLSearchParams initialized with the provided object.
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
 * Validates the Content Security Policy (CSP) of the target source.
 *
 * @param targetSrc - The target source URL to validate against the current origin.
 * @returns A promise that resolves if the CSP validation passes, otherwise it throws an error.
 *
 * @throws Will throw an error if the current origin is not included in the allowed domains from the target source's CSP.
 */
export const validateCSP = async (targetSrc: string) => {
  const { origin, host } = window.location;

  if (origin.includes(targetSrc)) return;

  const response = await fetch(`${targetSrc}${CSPApiUrl}`, {
    method: "get",
    headers: new Headers({
      "ngrok-skip-browser-warning": "69420",
    }),
  });
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

export const getCSPErrorBody = (src: string) => {
  return `<body style=background:#f3f4f4><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"rel=stylesheet><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style=flex-shrink:0;width:211px;height:24px;position:relative><img src=${src}/static/images/logo/lightsmall.svg></div><div style=display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative><div style=flex-shrink:0;width:120px;height:100px;position:relative><img src=${src}/static/images/frame-error.svg></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href=${src}/portal-settings/developer-tools/javascript-sdk style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline"target=_blank>the Developer Tools section</a>.</span></div></div></body>`;
};

export const getLoaderStyle = (className: string) => {
  return `
@keyframes rotate { 
  0%{ transform: rotate(-45deg); will-change: transform; } 
  15%{ transform: rotate(45deg); } 
  30%{ transform: rotate(135deg); } 
  45%{ transform: rotate(225deg); } 
  60%, 100%{ transform: rotate(315deg); } 
} 
.${className} { 
  width: 74px; 
  height: 74px; 
  border: 4px solid rgba(51,51,51, 0.1); 
  border-top-color: #333333; 
  border-radius: 50%; 
  transform: rotate(-45deg); 
  position: relative; 
  box-sizing: border-box; 
  animation: 1s linear infinite rotate; 
  will-change: transform;
} 
@media (prefers-color-scheme: dark) { 
  .${className} { 
    border-color: rgba(204, 204, 204, 0.1); 
    border-top-color: #CCCCCC; 
  } 
}
@media (prefers-reduced-motion: reduce) {
  .${className} {
    animation-duration: 1.5s;
  }
}`;
};

/**
 * Retrieves the configuration from the URL parameters of the current script element.
 *
 * This function extracts the `src` attribute from the current script element,
 * decodes it, and parses the query parameters to construct a configuration object.
 * The configuration is based on the `defaultConfig` object and overrides its properties
 * with the parsed parameters.
 *
 * @returns {TFrameConfig | null} The parsed configuration object or null if the `src` attribute is empty.
 */
export const getConfigFromParams = (): TFrameConfig | null => {
  const scriptElement = document.currentScript as HTMLScriptElement;
  const searchParams = new URL(decodeURIComponent(scriptElement.src))
    .searchParams;

  const configTemplate: TFrameConfig = { ...defaultConfig };

  type FilterParams = Record<string, string | number | boolean>;

  searchParams.forEach((value, key) => {
    const parsedValue =
      value === "true" ? true : value === "false" ? false : value;
    if (defaultConfig.filter && key in defaultConfig.filter) {
      (configTemplate.filter as FilterParams)[key] = parsedValue;
    } else {
      (configTemplate as unknown as FilterParams)[key] = parsedValue;
    }
  });

  // Ensure default values for mode and src
  configTemplate.mode = searchParams.get("mode") || "manager";
  configTemplate.src = searchParams.get("src") || "";

  return configTemplate;
};

/**
 * Generates a URL path based on the provided configuration.
 *
 * @param config - The configuration object for generating the frame path.
 * @returns The generated URL path as a string.
 *
 * @remarks
 * The function handles different modes specified in the `config.mode` property:
 * - `SDKMode.Manager`: Generates a path for the manager mode, including optional request tokens and filters.
 * - `SDKMode.RoomSelector`: Returns a fixed path for the room selector.
 * - `SDKMode.FileSelector`: Returns a path for the file selector with the specified selector type.
 * - `SDKMode.System`: Returns a fixed path for the system mode.
 * - `SDKMode.Editor`: Generates a path for the editor mode, including customization and event handling.
 * - `SDKMode.Viewer`: Generates a path for the viewer mode, similar to the editor mode but with view action.
 *
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

    default:
      return config.rootPath || "/";
  }
};
