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
import { SDK } from "../src/sdk";
import { SDKInstance } from "../src/instance";
import { defaultConfig } from "../src/constants";
import { SDKMode } from "../src/enums";
import { SDKError, SDKErrorCode } from "../src/errors";
import type { TFrameConfig } from "../src/types";
import { getFramePath } from "../src/utils";

const BASE_SRC = "https://portal.example.com";

const makePersonalConfig = (
  overrides: Partial<TFrameConfig> = {},
): TFrameConfig => ({
  ...defaultConfig,
  src: BASE_SRC,
  frameId: "ds-personal",
  mode: SDKMode.Personal,
  checkCSP: false,
  ...overrides,
});

const setupTarget = (id = "ds-personal") => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
};

const initConnected = (overrides: Partial<TFrameConfig> = {}) => {
  setupTarget();
  const config = makePersonalConfig(overrides);
  const inst = new SDKInstance(config);
  const iframe = inst.initFrame(config)!;
  iframe.dispatchEvent(new Event("load"));

  const postMessageSpy = vi.fn();
  Object.defineProperty(iframe, "contentWindow", {
    value: { postMessage: postMessageSpy },
    writable: true,
  });

  return { inst, iframe, postMessageSpy, config };
};

const dispatchResponse = (frameId: string, returnData: object = {}) => {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: JSON.stringify({
        frameId,
        type: "onMethodReturn",
        methodReturnData: returnData,
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

describe("getFramePath — Personal mode", () => {
  const query = (path: string) => new URLSearchParams(path.split("?")[1] ?? "");

  test("addresses the list page by folder alias: @my by default", () => {
    const path = getFramePath(makePersonalConfig());
    expect(path.startsWith("/sdk/personal-files?")).toBe(true);
    expect(query(path).get("folder")).toBe("@my");
  });

  test("maps every personalDestination to its folder alias", () => {
    const aliases = {
      "my-documents": "@my",
      favorites: "@favorites",
      recent: "@recent",
      "shared-with-me": "@share",
      trash: "@trash",
    } as const;

    for (const [section, alias] of Object.entries(aliases)) {
      const path = getFramePath(
        makePersonalConfig({ personalDestination: section as keyof typeof aliases }),
      );
      expect(path.startsWith("/sdk/personal-files?")).toBe(true);
      expect(query(path).get("folder")).toBe(alias);
    }
  });

  test("routes settings to its own page", () => {
    const path = getFramePath(makePersonalConfig({ personalDestination: "settings", theme: "Dark" }));
    expect(path.startsWith("/sdk/personal-files/settings?")).toBe(true);
    expect(query(path).get("theme")).toBe("Dark");
    expect(query(path).has("folder")).toBe(false);
  });

  test("uses id as the folder when set", () => {
    const path = getFramePath(makePersonalConfig({ id: "folder-42" }));
    expect(query(path).get("folder")).toBe("folder-42");
    expect(query(path).has("id")).toBe(false);
  });

  test("does not send showMenu, infoPanelVisible or downloadToEvent: Personal does not read them", () => {
    const path = getFramePath(
      makePersonalConfig({ showMenu: true, infoPanelVisible: true, downloadToEvent: true }),
    );
    expect(path).not.toContain("showMenu=");
    expect(path).not.toContain("infoPanelVisible=");
    expect(path).not.toContain("downloadToEvent=");
  });

  test("keeps theme and locale on the list page so the redirect cannot drop them", () => {
    const path = getFramePath(makePersonalConfig({ theme: "Dark", locale: "fr-FR" }));
    expect(query(path).get("theme")).toBe("Dark");
    expect(query(path).get("locale")).toBe("fr-FR");
  });

  test("includes disableActionButton flag", () => {
    const path = getFramePath(
      makePersonalConfig({ disableActionButton: true }),
    );
    expect(path).toContain("disableActionButton=true");
  });

  test("forwards filter sort params", () => {
    const path = getFramePath(
      makePersonalConfig({
        filter: {
          ...defaultConfig.filter,
          sortBy: "AZ",
          sortOrder: "ascending",
          search: "budget",
        },
      }),
    );
    expect(path).toContain("sortBy=AZ");
    expect(path).toContain("sortOrder=ascending");
    expect(path).toContain("search=budget");
  });

  test("sends filter.count as pageCount, the name the list page reads", () => {
    const path = getFramePath(
      makePersonalConfig({ filter: { ...defaultConfig.filter, count: "25", page: "2" } }),
    );
    expect(query(path).get("pageCount")).toBe("25");
    expect(query(path).get("page")).toBe("2");
    expect(query(path).has("count")).toBe(false);
  });

  test("includes theme and locale from baseFrameOptions", () => {
    const path = getFramePath(
      makePersonalConfig({ theme: "Dark", locale: "fr-FR" }),
    );
    expect(path).toContain("theme=Dark");
    expect(path).toContain("locale=fr-FR");
  });

  test("omits undefined id/flags", () => {
    const path = getFramePath(
      makePersonalConfig({
        id: null,
        showMenu: undefined,
        infoPanelVisible: undefined,
      }),
    );
    expect(path).not.toContain("id=");
    expect(path).not.toContain("showMenu=");
    expect(path).not.toContain("infoPanelVisible=");
  });

  test("includes auth params when providerName is set", () => {
    const path = getFramePath(
      makePersonalConfig({
        providerName: "nextcloud",
        inviteKey: "abc",
        emplType: "user",
        uid: "user-123",
      }),
    );
    expect(path).toContain("providerName=nextcloud");
    expect(path).toContain("inviteKey=abc");
    expect(path).toContain("emplType=user");
    expect(path).toContain("uid=user-123");
  });

  test("omits auth params when undefined", () => {
    const path = getFramePath(
      makePersonalConfig({
        providerName: undefined,
        inviteKey: undefined,
        emplType: undefined,
        uid: undefined,
      }),
    );
    expect(path).not.toContain("providerName");
    expect(path).not.toContain("inviteKey");
    expect(path).not.toContain("emplType");
    expect(path).not.toContain("uid=");
  });
});

describe("SDK.initPersonal", () => {
  test("forces mode to personal and leaves showMenu/infoPanelVisible on the defaults", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initPersonal({
      ...makePersonalConfig(),
      showMenu: undefined,
      infoPanelVisible: undefined,
    });

    expect(instance.config.mode).toBe(SDKMode.Personal);
    expect(instance.config.showMenu).toBeUndefined();
    expect(instance.config.infoPanelVisible).toBeUndefined();
  });

  test("respects explicit showMenu=false", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initPersonal({
      ...makePersonalConfig(),
      showMenu: false,
    });

    expect(instance.config.showMenu).toBe(false);
  });

  test("forces noLoader=true for Personal mode", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initPersonal(makePersonalConfig());

    expect(instance.config.noLoader).toBe(true);
  });

  test("applies personalDestination default from defaultConfig", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initPersonal({
      frameId: "ds-personal",
      src: BASE_SRC,
      mode: SDKMode.Personal,
      checkCSP: false,
    });

    expect(instance.config.personalDestination).toBe("my-documents");
  });
});

describe("navigateSection — Personal mode", () => {
  test("sends correct method name and section via postMessage", () => {
    const { inst, postMessageSpy } = initConnected();

    inst.navigateSection("trash");

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("navigateSection");
    expect(sent.data.data).toEqual({ section: "trash" });
  });

  test("resolves with iframe response", async () => {
    const { inst } = initConnected();

    const promise = inst.navigateSection("favorites");
    dispatchResponse("ds-personal", { section: "favorites" });

    const result = await promise;
    expect(result).toEqual({ section: "favorites" });
  });

  test("rejects with SDKError ModeMismatch when called in Manager mode", async () => {
    setupTarget("ds-manager");
    const config: TFrameConfig = {
      ...defaultConfig,
      src: BASE_SRC,
      frameId: "ds-manager",
      mode: SDKMode.Manager,
      checkCSP: false,
    };
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    let caught: unknown;
    try {
      await inst.navigateSection("my-documents");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SDKError);
    expect((caught as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
  });
});

describe("upload — Personal mode", () => {
  const dispatchUploadEvent = (event: "onUploadSuccess" | "onUploadError", data: object) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-personal",
          type: "onEventReturn",
          eventReturnData: { event, data },
        }),
        origin: BASE_SRC,
      }),
    );
  };

  test("posts uploadFileData with the file metadata and resolves with the onUploadSuccess payload", async () => {
    const { inst, postMessageSpy } = initConnected();
    postMessageSpy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string; fileName?: string };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        queueMicrotask(() =>
          dispatchUploadEvent("onUploadSuccess", { fileName: m.fileName, fileSize: 4, uploadId: 1 }),
        );
      }
    });

    const result = await inst.upload(new File(["data"], "photo.png"));

    const raw = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    expect(raw).toBeDefined();
    expect(raw![0]).toMatchObject({ frameId: "ds-personal", fileName: "photo.png", fileSize: 4 });
    expect(raw![0].buffer).toBeInstanceOf(ArrayBuffer);
    expect(result).toEqual({ fileName: "photo.png", fileSize: 4, uploadId: 1 });
  });

  test("rejects with UploadFailed when the frame reports onUploadError", async () => {
    const { inst, postMessageSpy } = initConnected();
    postMessageSpy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string; fileName?: string };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        queueMicrotask(() => dispatchUploadEvent("onUploadError", { fileName: m.fileName, message: "Quota exceeded" }));
      }
    });

    await expect(inst.upload(new File(["data"], "big.bin"))).rejects.toMatchObject({
      code: SDKErrorCode.UploadFailed,
      message: "Quota exceeded",
    });
  });
});
