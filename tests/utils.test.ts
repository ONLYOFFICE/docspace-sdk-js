/*
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
 */

import {
  customUrlSearchParams,
  validateCSP,
  getConfigFromParams,
  getCSPErrorBody,
  getLoaderStyle,
  getFramePath,
} from "../src/utils";
import { cspErrorText, defaultConfig } from "../src/constants";
import type { TFrameConfig } from "../src/types";
import { SDKMode } from "../src/enums";

describe("customUrlSearchParams", () => {
  it("should convert an object with string values to URLSearchParams", () => {
    const params = customUrlSearchParams({ key1: "value1", key2: "value2" });
    expect(params.toString()).toBe("key1=value1&key2=value2");
  });

  it("should convert an object with number values to URLSearchParams", () => {
    const params = customUrlSearchParams({ key1: 1, key2: 2 });
    expect(params.toString()).toBe("key1=1&key2=2");
  });

  it("should convert an object with boolean values to URLSearchParams", () => {
    const params = customUrlSearchParams({ key1: true, key2: false });
    expect(params.toString()).toBe("key1=true&key2=false");
  });

  it("should handle mixed types in the object", () => {
    const params = customUrlSearchParams({
      key1: "value1",
      key2: 2,
      key3: true,
    });
    expect(params.toString()).toBe("key1=value1&key2=2&key3=true");
  });

  it("should handle empty object", () => {
    const params = customUrlSearchParams({});
    expect(params.toString()).toBe("");
  });

  it("should handle multiple keys", () => {
    const params = customUrlSearchParams({
      key1: "value1",
      key2: "value2",
    });
    expect(params.toString()).toBe("key1=value1&key2=value2");
  });
});

describe("validateCSP", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            response: {
              domains: [
                "test.com",
                "https://test.com/",
                "https://test.com/example",
              ],
            },
          }),
      })
    ) as jest.Mock;
  });

  it("should pass CSP validation if current origin is same as target", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "test.com",
      },
    });

    await expect(validateCSP("https://test.com")).resolves.not.toThrow();
  });

  it("should pass CSP validation if current origin is included in allowed domains", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "test.com",
      },
      writable: true,
    });

    await expect(validateCSP("https://example.com")).resolves.not.toThrow();
  });

  it("should pass CSP validation if current origin is included in allowed domains and has empty host", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "",
      },
      writable: true,
    });

    await expect(validateCSP("https://example.com")).resolves.not.toThrow();
  });

  it("should throw an error if current origin is not included in allowed domains", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://another.com",
        host: "another.com",
      },
      writable: true,
    });

    await expect(validateCSP("https://example.com")).rejects.toThrow(
      cspErrorText
    );
  });

  it("should throw an error for invalid JSON response", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.reject("Invalid JSON"),
      })
    ) as jest.Mock;

    await expect(validateCSP("https://example.com")).rejects.toThrow(
      "CSP validation failed: Invalid JSON"
    );
  });
});

describe("getConfigFromParams", () => {
  it("should return the correct config from URL parameters", () => {
    Object.defineProperty(document, "currentScript", {
      value: {
        src: "https://example.com/api.js?src=&showHeaderBanner=none&showMenu=false&withSearch=true&count=100&mode=manager",
      },
      writable: true,
    });

    const result = getConfigFromParams();

    expect(result).toEqual(defaultConfig);
  });

  it("should return the correct config if URL has empty options", () => {
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://example.com?src=https://example.com&mode=editor';
    document.body.appendChild(scriptElement);
    Object.defineProperty(document, "currentScript", {
      value: scriptElement,
    });

    const config = getConfigFromParams();

    expect(config).toEqual({
      ...defaultConfig,
      src: 'https://example.com',
      mode: 'editor',
    });

    document.body.removeChild(scriptElement);
  });

  it("should return the correct config with extended options on main level of config", () => {
    Object.defineProperty(document, "currentScript", {
      value: {
        src: "https://example.com/api.js?src=https://example.com&mode=editor&test=true",
      },
    });

    const result = getConfigFromParams();

    expect(result).toHaveProperty("test");
  });
});

describe("getCSPErrorBody", () => {
  it("should return the correct HTML string with the provided src", () => {
    const src = "https://example.com";
    const expectedHtml = `<body style=background:#f3f4f4><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"rel=stylesheet><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style=flex-shrink:0;width:211px;height:24px;position:relative><img src=${src}/static/images/logo/lightsmall.svg></div><div style=display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative><div style=flex-shrink:0;width:120px;height:100px;position:relative><img src=${src}/static/images/frame-error.svg></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href=${src}/portal-settings/developer-tools/javascript-sdk style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline"target=_blank>the Developer Tools section</a>.</span></div></div></body>`;

    const result = getCSPErrorBody(src);
    expect(result).toBe(expectedHtml);
  });

  it("should handle different src values correctly", () => {
    const src = "https://another-example.com";
    const expectedHtml = `<body style=background:#f3f4f4><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"rel=stylesheet><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style=flex-shrink:0;width:211px;height:24px;position:relative><img src=${src}/static/images/logo/lightsmall.svg></div><div style=display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative><div style=flex-shrink:0;width:120px;height:100px;position:relative><img src=${src}/static/images/frame-error.svg></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href=${src}/portal-settings/developer-tools/javascript-sdk style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline"target=_blank>the Developer Tools section</a>.</span></div></div></body>`;

    const result = getCSPErrorBody(src);
    expect(result).toBe(expectedHtml);
  });
});

describe("getLoaderStyle", () => {
  it("should return the correct CSS for the given class name", () => {
    const className = "loader";
    const expectedCSS = `@keyframes rotate { 0%{ transform: rotate(-45deg); } 15%{ transform: rotate(45deg); } 30%{ transform: rotate(135deg); } 45%{ transform: rotate(225deg); } 60%, 100%{ transform: rotate(315deg); } } .${className} { width: 74px; height: 74px; border: 4px solid rgba(51,51,51, 0.1); border-top-color: #333333; border-radius: 50%; transform: rotate(-45deg); position: relative; box-sizing: border-box; animation: 1s linear infinite rotate; } @media (prefers-color-scheme: dark) { .${className} { border-color: rgba(204, 204, 204, 0.1); border-top-color: #CCCCCC; } }`;

    const result = getLoaderStyle(className);
    expect(result).toBe(expectedCSS);
  });

  it("should handle different class names correctly", () => {
    const className = "spinner";
    const expectedCSS = `@keyframes rotate { 0%{ transform: rotate(-45deg); } 15%{ transform: rotate(45deg); } 30%{ transform: rotate(135deg); } 45%{ transform: rotate(225deg); } 60%, 100%{ transform: rotate(315deg); } } .${className} { width: 74px; height: 74px; border: 4px solid rgba(51,51,51, 0.1); border-top-color: #333333; border-radius: 50%; transform: rotate(-45deg); position: relative; box-sizing: border-box; animation: 1s linear infinite rotate; } @media (prefers-color-scheme: dark) { .${className} { border-color: rgba(204, 204, 204, 0.1); border-top-color: #CCCCCC; } }`;

    const result = getLoaderStyle(className);
    expect(result).toBe(expectedCSS);
  });
});

describe("getFramePath", () => {
  describe("Manager mode", () => {
    it("should return the correct path for SDKMode.Manager", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Manager,
        id: "1",
        rootPath: "/root/",
        filter: {},
      };
      const path = getFramePath(config);
      expect(path).toContain("/root/1/filter?folder=1");
    });
  });

  describe("Room selector mode", () => {
    it("should return the correct path for SDKMode.RoomSelector", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.RoomSelector,
        rootPath: "/root",
      };
      const path = getFramePath(config);
      expect(path).toBe(`/sdk/room-selector`);
    });
  });

  describe("File selector mode", () => {
    it("should return the correct path for SDKMode.FileSelector", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.FileSelector,
        selectorType: "all",
      };
      const path = getFramePath(config);
      expect(path).toBe("/sdk/file-selector?selectorType=all");
    });
  });

  describe("Editor mode", () => {
    it("should return the correct path for SDKMode.Editor", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Editor,
        id: "123",
        editorType: "desktop",
        editorGoBack: "back",
        editorCustomization: {},
        theme: "Base",
      };
      const path = getFramePath(config);
      expect(path).toContain("/doceditor?fileId=123&editorType=desktop");
    });
  });

  describe("Viewer mode", () => {
    it("should return the correct path for SDKMode.Viewer", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Viewer,
        id: "123",
        editorType: "embedded",
        editorGoBack: "back",
        editorCustomization: {},
        theme: "Dark",
      };
      const path = getFramePath(config);
      expect(path).toContain(
        "/doceditor?fileId=123&editorType=embedded&action=view"
      );
    });
  });

  describe("System mode", () => {
    it("should return the correct path for SDKMode.System", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.System,
      };
      const path = getFramePath(config);
      expect(path).toBe("/sdk/system");
    });
  });

  it("should handle all mode combinations correctly", () => {
    const modes = Object.values(SDKMode);
    modes.forEach((mode) => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode,
      };
      expect(() => getFramePath(config)).not.toThrow();
    });
  });
});
