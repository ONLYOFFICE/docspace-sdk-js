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

import { vi } from "vitest";
import { SDKInstance } from "../src/instance";
import { SDK } from "../src/sdk";
import { defaultConfig } from "../src/constants";
import { SDKMode } from "../src/enums";
import type { TFrameConfig } from "../src/types";
import { getFramePath } from "../src/utils";

const BASE_SRC = "https://portal.example.com";
const FRAME_ID = "ds-media";

const makeMediaViewerConfig = (
  overrides: Partial<TFrameConfig> = {},
): TFrameConfig => ({
  ...defaultConfig,
  src: BASE_SRC,
  frameId: FRAME_ID,
  mode: SDKMode.MediaViewer,
  checkCSP: false,
  id: "folder-42",
  ...overrides,
});

const setupTarget = (id = FRAME_ID) => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
};

const dispatchEvent = (eventName: string, data?: unknown) => {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: JSON.stringify({
        frameId: FRAME_ID,
        type: "onEventReturn",
        eventReturnData: { event: eventName, data },
      }),
      origin: BASE_SRC,
    }),
  );
};

beforeEach(() => {
  document.body.innerHTML = "";
  window.DocSpace = { SDK: { init: vi.fn(), frames: {} } as unknown as SDK };
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getFramePath — MediaViewer mode", () => {
  test("builds /sdk/media-viewer with folder from config.id", () => {
    const path = getFramePath(makeMediaViewerConfig({ id: "folder-99" }));
    expect(path).toContain("/sdk/media-viewer");
    expect(path).toContain("folder=folder-99");
  });

  test("passes requestToken as key", () => {
    const path = getFramePath(makeMediaViewerConfig({ requestToken: "tok" }));
    expect(path).toContain("key=tok");
  });

  test("passes fileId when set", () => {
    const path = getFramePath(makeMediaViewerConfig({ fileId: 7 }));
    expect(path).toContain("fileId=7");
  });

  test("omits key and fileId when unset", () => {
    const path = getFramePath(makeMediaViewerConfig());
    expect(path).not.toContain("key=");
    expect(path).not.toContain("fileId");
  });

  test("includes the base frame params", () => {
    const path = getFramePath(
      makeMediaViewerConfig({
        locale: "en-US",
        stylesUrl: "https://cdn.example.com/theme.css",
      }),
    );
    expect(path).toContain("locale=en-US");
    expect(path).toContain(
      "stylesUrl=https%3A%2F%2Fcdn.example.com%2Ftheme.css",
    );
  });
});

describe("SDK.initMediaViewer", () => {
  test("forces mode to media-viewer and loads the media viewer frame", () => {
    setupTarget();
    const sdk = new SDK();
    const inst = sdk.initMediaViewer({
      ...makeMediaViewerConfig(),
      mode: SDKMode.Manager,
    });

    expect(inst.getConfig().mode).toBe(SDKMode.MediaViewer);
    expect(sdk.frames[FRAME_ID]).toBe(inst);

    const iframe = document.querySelector("iframe")!;
    expect(iframe.src).toContain(`${BASE_SRC}/sdk/media-viewer`);
    expect(iframe.src).toContain("folder=folder-42");
  });
});

describe("events — MediaViewer mode", () => {
  const initWithEvents = (events: Partial<TFrameConfig["events"]>) => {
    setupTarget();
    const config = makeMediaViewerConfig({
      events: { ...defaultConfig.events, ...events },
    });
    const inst = new SDKInstance(config);
    inst.initFrame(config);
    return inst;
  };

  test("onAppReady fires on an onEventReturn message", () => {
    const onAppReady = vi.fn();
    initWithEvents({ onAppReady });

    dispatchEvent("onAppReady", { frameId: FRAME_ID });

    expect(onAppReady).toHaveBeenCalledWith({ frameId: FRAME_ID });
  });

  test.each(["onNoAccess", "onNotFound"] as const)(
    "%s fires on an onEventReturn message",
    (eventName) => {
      const handler = vi.fn();
      initWithEvents({ [eventName]: handler });

      dispatchEvent(eventName);

      expect(handler).toHaveBeenCalledTimes(1);
    },
  );
});
