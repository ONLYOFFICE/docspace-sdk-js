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

const registerScript = (src: string) => {
  const script = document.createElement("script");
  script.src = src;
  document.body.appendChild(script);
  Object.defineProperty(document, "currentScript", { value: script, configurable: true });
  return script;
};

afterEach(() => {
  const scripts = Array.from(document.querySelectorAll("script"));
  scripts.forEach((s) => s.parentElement?.removeChild(s));

  // @ts-ignore
  delete (window as any).location;
  jest.restoreAllMocks();
});

describe("customUrlSearchParams", () => {
  test.each<[{[k: string]: any}, string, string]>([
    [{ key1: "value1", key2: "value2" }, "key1=value1&key2=value2", "string values"],
    [{ key1: 1, key2: 2 }, "key1=1&key2=2", "number values"],
    [{ key1: true, key2: false }, "key1=true&key2=false", "boolean values"],
    [{ key1: "value1", key2: 2, key3: true }, "key1=value1&key2=2&key3=true", "mixed values"],
    [{}, "", "empty object"],
  ])("serializes %s (%s)", (input, expected) => {
    const result = customUrlSearchParams(input);
    expect(result).toBe(expected);
  });

  test("should omit undefined & null values", () => {
    const result = customUrlSearchParams({ a: "1", b: undefined, c: null } as any);
    expect(result).toBe("a=1");
  });
});

describe("validateCSP", () => {
  const defaultOrigin = window.location.origin;
  const host = window.location.host;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("passes when origin includes targetSrc (short-circuit) and skips fetch", async () => {
    (global as any).fetch = jest.fn();
    await expect(validateCSP(defaultOrigin)).resolves.not.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("passes when host is in fetched domains", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ response: { domains: [host, `https://${host}/path`] } }),
    });
    await expect(validateCSP("https://remote.example"))
      .resolves.not.toThrow();
  });

  test("passes when host is empty but origin host matches (simulated by domains including origin host)", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ response: { domains: [new URL(defaultOrigin).host] } }),
    });
    await expect(validateCSP("https://remote.example"))
      .resolves.not.toThrow();
  });

  test("throws when host not included", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ response: { domains: ["other.com"] } }),
    });
    await expect(validateCSP("https://remote.example"))
      .rejects.toThrow(cspErrorText);
  });

  test("throws on invalid JSON", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => { throw "Invalid JSON"; },
    });
    await expect(validateCSP("https://remote.example"))
      .rejects.toThrow("CSP validation failed: Invalid JSON");
  });
});

describe("getConfigFromParams", () => {
  test("returns merged default config from URL parameters", () => {
    registerScript(
      "https://example.com/api.js?src=&showHeaderBanner=none&showMenu=false&withSearch=true&count=100&mode=manager"
    );
    const result = getConfigFromParams();
    expect(result).toEqual(defaultConfig);
  });

  test("applies provided src and mode", () => {
    registerScript(
      "https://example.com?src=https://example.com&mode=editor"
    );
    const config = getConfigFromParams();
    expect(config).toEqual({
      ...defaultConfig,
      src: "https://example.com",
      mode: "editor",
    });
  });

  test("adds non-filter extra options at root level", () => {
    registerScript(
      "https://example.com/api.js?src=https://example.com&mode=editor&test=true"
    );
    const result = getConfigFromParams();
  expect(result).toHaveProperty("test", true);
  });

  test("maps filter keys into filter object only", () => {
    registerScript(
      "https://example.com/api.js?src=&mode=manager&count=50&search=query"
    );
    const result = getConfigFromParams();
    expect(result?.filter?.count).toBe("50");
    expect(result?.filter?.search).toBe("query");
  });
});

describe("getCSPErrorBody", () => {
  test.each([
    "https://example.com",
    "https://another-example.com",
  ])("generates HTML containing dynamic src for %s", (src) => {
    const result = getCSPErrorBody(src);
    expect(result).toContain(`${src}/static/images/logo/lightsmall.svg`);
    expect(result).toContain(cspErrorText);
    expect(result).toContain(`${src}/developer-tools/javascript-sdk`);
  });
});

describe("getLoaderStyle", () => {
  test.each(["loader", "spinner", "any-class"])(
    "returns CSS containing expected class token for %s",
    (className) => {
      const css = getLoaderStyle(className);
      expect(css).toContain(`.${className}`);
      expect(css).toContain("@keyframes rotate");
    }
  );
});

describe("getFramePath", () => {
  describe("getFramePath modes", () => {
    test("Manager mode with id adds folder param and omits withSubfolders when false", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Manager,
        id: "1",
        rootPath: "/root/",
        filter: { withSubfolders: false },
      };
      const path = getFramePath(config);
      expect(path).toMatch(/\/root\/1\/filter\?folder=1/);
      expect(path).not.toContain("withSubfolders=false");
    });

    test("Manager mode with requestToken uses key query style", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Manager,
        id: "55",
        requestToken: "abc123",
        rootPath: "/rooms/shared/",
        filter: { search: "doc" },
      };
      const path = getFramePath(config);
      expect(path).toContain("?key=abc123");
      expect(path).toContain("search=doc");
      expect(path).not.toContain("filter?");
    });

    test("PublicRoom mode builds expected path", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.PublicRoom,
        id: "999",
        requestToken: "tok",
        showFilter: true,
        showHeader: true,
        showTitle: false,
        theme: "Base",
      } as any;
      const path = getFramePath(config);
      expect(path).toContain("/sdk/public-room");
      expect(path).toContain("folder=999");
      expect(path).toContain("key=tok");
    });

    test("RoomSelector mode base path", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.RoomSelector,
      } as any;
      const path = getFramePath(config);
      expect(path).toBe(`/sdk/room-selector`);
    });

    test("FileSelector mode with selectorType", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.FileSelector,
        selectorType: "all",
      } as any;
      const path = getFramePath(config);
      expect(path).toBe("/sdk/file-selector?selectorType=all");
    });

    test("Editor mode includes editorGoBack true", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Editor,
        id: "123",
        editorType: "desktop",
        editorGoBack: true,
        theme: "Base",
      } as any;
      const path = getFramePath(config);
      expect(path).toContain("/doceditor?theme=Base&isSDK=true&fileId=123&editorType=desktop&editorGoBack=true");
    });

    test("Editor mode with onEditorCloseCallback converts editorGoBack to event", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Editor,
        id: "1",
        editorType: "desktop",
        events: { onEditorCloseCallback: () => {} },
      } as any;
      const path = getFramePath(config);
      expect(path).toContain("editorGoBack=event");
    });

    test("Viewer mode includes action=view", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.Viewer,
        id: "123",
        editorType: "embedded",
        theme: "Dark",
      } as any;
      const path = getFramePath(config);
      expect(path).toContain("action=view");
      expect(path).toContain("fileId=123");
    });

    test("System mode base path", () => {
      const config: TFrameConfig = {
        src: "https://example.com",
        frameId: "ds-frame",
        mode: SDKMode.System,
      } as any;
      const path = getFramePath(config);
      expect(path).toBe("/old-sdk/system");
    });

    test("handles all modes without throwing", () => {
      Object.values(SDKMode).forEach((mode) => {
        const conf: TFrameConfig = { src: "https://example.com", frameId: "ds-frame", mode } as any;
        expect(() => getFramePath(conf)).not.toThrow();
      });
    });
  });
});
