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
import type { SDK } from "../src/sdk";
import { cspErrorText, defaultConfig, FRAME_NAME, MAX_TIMER_DELAY_MS, TOKEN_REFRESH_LEAD_MS } from "../src/constants";
import { getCSPErrorBody } from "../src/utils";
import { SDKError, SDKErrorCode } from "../src/errors";
import { RoomType } from "../src/enums";
import type {
  TFrameConfig,
  TUploadError,
  TUploadProgress,
  TUploadResult,
  TUploaderUploadError,
  TUploaderUploadResult,
} from "../src/types";

const BASE_SRC = "https://portal.example.com";

const makeConfig = (overrides: Partial<TFrameConfig> = {}): TFrameConfig => ({
  ...defaultConfig,
  src: BASE_SRC,
  frameId: "ds-frame",
  mode: "manager",
  checkCSP: false,
  ...overrides,
});

const setupTarget = (id = "ds-frame") => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
};

beforeEach(() => {
  document.body.innerHTML = "";

  window.DocSpace = {
    SDK: { init: vi.fn(), frames: {} } as unknown as SDK,
  };

  vi.stubGlobal(
    "requestAnimationFrame",
    (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("initFrame — DOM setup", () => {
  test("returns null when target element doesn't exist in DOM", () => {
    const inst = new SDKInstance(makeConfig());
    const result = inst.initFrame(makeConfig());
    expect(result).toBeNull();
  });

  test("creates container with iframe when target exists", () => {
    setupTarget();
    const inst = new SDKInstance(makeConfig());
    const iframe = inst.initFrame(makeConfig());

    expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    const container = document.getElementById("ds-frame-container");
    expect(container).not.toBeNull();
    expect(container!.querySelector("iframe")).toBe(iframe);
  });

  test("creates loader when noLoader is false (manager mode forces noLoader: false)", () => {
    setupTarget();
    const config = makeConfig({ mode: "manager" });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    const loader = document.getElementById("ds-frame-loader");
    expect(loader).not.toBeNull();
  });

  test("skips loader when noLoader is true", () => {
    setupTarget();
    const config = makeConfig({ mode: "editor", noLoader: true });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    const loader = document.getElementById("ds-frame-loader");
    expect(loader).toBeNull();
  });

  test("replaces existing container on re-init", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);

    const first = inst.initFrame(config);
    const second = inst.initFrame(config);

    expect(second).toBeInstanceOf(HTMLIFrameElement);
    expect(second).not.toBe(first);

    const containers = document.querySelectorAll("#ds-frame-container");
    expect(containers.length).toBe(1);
  });

  test("sets iframe src to config.src + getFramePath(config)", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    expect(iframe.src).toContain(BASE_SRC);
  });

  test("sets iframe name to FRAME_NAME__#frameId", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    expect(iframe.name).toBe(`${FRAME_NAME}__#ds-frame`);
  });
});

describe("destroyFrame — cleanup", () => {
  test("replaces container with a div containing destroyText", () => {
    setupTarget();
    const config = makeConfig({ destroyText: "Frame removed" });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    inst.destroyFrame();

    const container = document.getElementById("ds-frame-container");
    expect(container).toBeNull();

    const restored = document.getElementById("ds-frame");
    expect(restored).not.toBeNull();
    expect(restored!.innerHTML).toBe("Frame removed");
  });

  test("restores original element id", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    inst.destroyFrame();

    const el = document.getElementById("ds-frame");
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe("DIV");
  });

  test("removes message event listener from window", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    const removeSpy = vi.spyOn(window, "removeEventListener");

    iframe.dispatchEvent(new Event("load"));

    inst.destroyFrame();

    expect(removeSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });
});

describe("getConfig", () => {
  test("returns the current config object", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    const returned = inst.getConfig();
    expect(returned.frameId).toBe("ds-frame");
    expect(returned.src).toBe(BASE_SRC);
  });

  test("initFrame preserves constructor config when field is omitted", () => {
    setupTarget();
    const ctorConfig = makeConfig({ src: "https://custom.example.com", theme: "Dark" });
    const inst = new SDKInstance(ctorConfig);
    inst.initFrame({ frameId: "ds-frame", mode: "manager", src: "https://custom.example.com", checkCSP: false });

    const returned = inst.getConfig();
    expect(returned.theme).toBe("Dark");
  });
});

describe("setConfig", () => {
  test("merges new config into existing", () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;
    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    inst.setConfig({ ...config, theme: "Dark" });

    expect(inst.getConfig().theme).toBe("Dark");
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const [envelope, targetOrigin] = postMessageSpy.mock.calls[0];
    const sent = JSON.parse(envelope);
    expect(targetOrigin).toBe(BASE_SRC);
    expect(sent.frameId).toBe("ds-frame");
    expect(sent.data.methodName).toBe("setConfig");
    expect(sent.data.data).toMatchObject({ theme: "Dark", src: BASE_SRC, frameId: "ds-frame", mode: "manager" });
  });

  test("reload=true re-initializes the frame and resolves with config", async () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    const result = await inst.setConfig({ ...config, height: "500px" }, true);

    expect(result).toHaveProperty("height", "500px");

    const newIframe = document.getElementById("ds-frame") as HTMLIFrameElement;
    expect(newIframe).toBeInstanceOf(HTMLIFrameElement);
  });
});

describe("setIsLoaded", () => {
  test("calls onContentReady event", () => {
    const onContentReady = vi.fn();
    setupTarget();
    const config = makeConfig({
      events: { ...defaultConfig.events, onContentReady },
    });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    inst.setIsLoaded();

    expect(onContentReady).toHaveBeenCalled();
  });
});

describe("executeMethod before connection", () => {
  test("calls onAppError when method is invoked before iframe load", () => {
    const onAppError = vi.fn();
    setupTarget();
    const config = makeConfig({
      events: { ...defaultConfig.events, onAppError },
    });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    inst.getFiles();

    expect(onAppError).toHaveBeenCalledWith("Message bus is not connected with frame");
  });
});

describe("message handling", () => {
  const initConnectedInstance = (configOverrides: Partial<TFrameConfig> = {}) => {
    setupTarget();
    const config = makeConfig(configOverrides);
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    iframe.dispatchEvent(new Event("load"));

    return { inst, iframe, config };
  };

  const dispatchMessage = (data: object) => {
    const event = new MessageEvent("message", {
      data: JSON.stringify(data),
      origin: BASE_SRC,
    });
    window.dispatchEvent(event);
  };

  test("OnMethodReturn: resolves pending method promise with returned data", async () => {
    const { inst, iframe } = initConnectedInstance();

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    const promise = inst.getFiles();

    dispatchMessage({
      frameId: "ds-frame",
      type: "onMethodReturn",
      methodReturnData: { files: [1, 2, 3] },
      commandName: "getFiles",
    });

    const result = await promise;
    expect(result).toEqual({ files: [1, 2, 3] });
  });

  test("OnEventReturn: calls the matching event handler from config.events", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      events: { ...defaultConfig.events, onAppReady },
    });

    dispatchMessage({
      frameId: "ds-frame",
      type: "onEventReturn",
      commandName: "",
      eventReturnData: {
        event: "onAppReady",
        data: { status: "ok" },
      },
    });

    expect(onAppReady).toHaveBeenCalledWith({ status: "ok" });
  });

  test("OnCallCommand: calls the named public method on the instance", () => {
    const { inst } = initConnectedInstance();

    const spy = vi.spyOn(inst, "setIsLoaded");

    dispatchMessage({
      frameId: "ds-frame",
      type: "onCallCommand",
      commandName: "setIsLoaded",
    });

    expect(spy).toHaveBeenCalled();
  });

  test("OnCallCommand: blocks methods not in allowlist", () => {
    const { inst } = initConnectedInstance();

    const spy = vi.spyOn(inst, "destroyFrame");

    dispatchMessage({
      frameId: "ds-frame",
      type: "onCallCommand",
      commandName: "destroyFrame",
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test("ignores messages for a different frameId", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      events: { ...defaultConfig.events, onAppReady },
    });

    dispatchMessage({
      frameId: "other-frame",
      type: "onEventReturn",
      commandName: "",
      eventReturnData: {
        event: "onAppReady",
        data: {},
      },
    });

    expect(onAppReady).not.toHaveBeenCalled();
  });

  test("ignores non-string messages", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      events: { ...defaultConfig.events, onAppReady },
    });

    const event = new MessageEvent("message", {
      data: { notAString: true },
    });
    window.dispatchEvent(event);

    expect(onAppReady).not.toHaveBeenCalled();
  });

  test("ignores messages from a different origin", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      events: { ...defaultConfig.events, onAppReady },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onEventReturn",
          commandName: "",
          eventReturnData: { event: "onAppReady", data: {} },
        }),
        origin: "https://evil.example.com",
      }),
    );

    expect(onAppReady).not.toHaveBeenCalled();
  });

  test("ignores messages with empty origin", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      events: { ...defaultConfig.events, onAppReady },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onEventReturn",
          commandName: "",
          eventReturnData: { event: "onAppReady", data: {} },
        }),
        origin: "",
      }),
    );

    expect(onAppReady).not.toHaveBeenCalled();
  });

  test("accepts messages when src has a path (origin still matches)", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      src: "https://portal.example.com/portal/room",
      events: { ...defaultConfig.events, onAppReady },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onEventReturn",
          commandName: "",
          eventReturnData: { event: "onAppReady", data: { ok: true } },
        }),
        origin: "https://portal.example.com",
      }),
    );

    expect(onAppReady).toHaveBeenCalledWith({ ok: true });
  });

  test("accepts messages when src has a trailing slash", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      src: "https://portal.example.com/",
      events: { ...defaultConfig.events, onAppReady },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onEventReturn",
          commandName: "",
          eventReturnData: { event: "onAppReady", data: { ok: true } },
        }),
        origin: "https://portal.example.com",
      }),
    );

    expect(onAppReady).toHaveBeenCalledWith({ ok: true });
  });

  test("accepts messages with non-default port", () => {
    const onAppReady = vi.fn();
    initConnectedInstance({
      src: "http://localhost:8080",
      events: { ...defaultConfig.events, onAppReady },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onEventReturn",
          commandName: "",
          eventReturnData: { event: "onAppReady", data: { ok: true } },
        }),
        origin: "http://localhost:8080",
      }),
    );

    expect(onAppReady).toHaveBeenCalledWith({ ok: true });
  });

  test("blocks onCallCommand from wrong origin (prevents remote method execution)", () => {
    const { inst } = initConnectedInstance();
    const spy = vi.spyOn(inst, "setIsLoaded");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onCallCommand",
          commandName: "setIsLoaded",
        }),
        origin: "https://attacker.example.com",
      }),
    );

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("method wrappers — postMessage verification", () => {
  const initWithPostMessage = () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, iframe, postMessageSpy };
  };

  test("getFiles() posts the correct method name", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.getFiles();

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("getFiles");
  });

  test("createFolder() posts the correct method name", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createFolder("parent-123", "New Folder");

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("createFolder");
  });

  test("getUserInfo() posts the correct method name", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.getUserInfo();

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("getUserInfo");
  });
});

describe("method errors reported by the portal", () => {
  const initWithPostMessage = () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, postMessageSpy };
  };

  const reply = (callId: number, methodReturnData: unknown) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ frameId: "ds-frame", type: "onMethodReturn", callId, methodReturnData, commandName: "" }),
        origin: BASE_SRC,
      }),
    );
  };

  const sentCallId = (spy: ReturnType<typeof vi.fn>, index = 0) =>
    JSON.parse(spy.mock.calls[index][0]).callId as number;

  const rawAxiosError = {
    name: "AxiosError",
    message: "Request failed with status code 401",
    code: "ERR_BAD_REQUEST",
    status: 401,
    stack: "AxiosError: Request failed\n    at settle",
    config: { url: "/api/2.0/authentication", data: '{"passwordHash":"secret-hash"}' },
  };

  test("isError marker rejects with ApiError carrying status and sanitized data", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.getFiles();
    reply(sentCallId(postMessageSpy), { isError: true, status: 403, message: "Forbidden", name: "AxiosError" });

    let caught: unknown;
    try {
      await promise;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SDKError);
    const err = caught as SDKError;
    expect(err.code).toBe(SDKErrorCode.ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.data).toEqual({ status: 403, message: "Forbidden", name: "AxiosError" });
  });

  test("isError marker without message falls back to a method-based message", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.getFolders();
    reply(sentCallId(postMessageSpy), { isError: true, status: 500 });

    await expect(promise).rejects.toMatchObject({
      code: SDKErrorCode.ApiError,
      message: "getFolders failed with status 500",
    });
  });

  test("isError marker strips config, request and stack from the rejection data", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.getFiles();
    reply(sentCallId(postMessageSpy), { ...rawAxiosError, isError: true, request: {} });

    let caught: unknown;
    try {
      await promise;
    } catch (e) {
      caught = e;
    }

    const data = (caught as SDKError).data as Record<string, unknown>;
    expect(data).not.toHaveProperty("config");
    expect(data).not.toHaveProperty("request");
    expect(data).not.toHaveProperty("stack");
    expect(data).not.toHaveProperty("isError");
    expect(JSON.stringify(caught)).not.toContain("secret-hash");
  });

  test("legacy login resolves the flagged error as { status, message } without the marker", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.login("user@example.com", "hash");
    reply(sentCallId(postMessageSpy), { ...rawAxiosError, isError: true });

    const result = await promise;
    expect(result).toMatchObject({ status: 401, message: "Request failed with status code 401" });
    expect(result).not.toHaveProperty("isError");
    expect(result).not.toHaveProperty("config");
    expect(result).not.toHaveProperty("stack");
  });

  test("legacy createRoom resolves the flagged error instead of rejecting", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.createRoom("Room", 5);
    reply(sentCallId(postMessageSpy), { isError: true, status: 403, message: "Forbidden" });

    await expect(promise).resolves.toEqual({ status: 403, message: "Forbidden" });
  });

  test("older portal: a serialized AxiosError resolves without config, request and stack", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.login("user@example.com", "hash");
    reply(sentCallId(postMessageSpy), { ...rawAxiosError, request: {} });

    const result = await promise;
    expect(result).toEqual({
      name: "AxiosError",
      message: "Request failed with status code 401",
      code: "ERR_BAD_REQUEST",
      status: 401,
    });
    expect(JSON.stringify(result)).not.toContain("secret-hash");
  });

  test("older portal: a failed HTTP status without an AxiosError name is sanitized too", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.getFiles();
    reply(sentCallId(postMessageSpy), { status: 404, message: "Not found", stack: "Error: Not found", config: {} });

    await expect(promise).resolves.toEqual({ status: 404, message: "Not found" });
  });

  test("a successful reply is passed through untouched", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.getFiles();
    reply(sentCallId(postMessageSpy), { files: [1], status: 200, config: { keep: true } });

    await expect(promise).resolves.toEqual({ files: [1], status: 200, config: { keep: true } });
  });

  test("a primitive reply (createHash) resolves as is", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.createHash("p@ss", { size: 256, iterations: 1000, salt: "salt" });
    reply(sentCallId(postMessageSpy), "hashed-value");

    await expect(promise).resolves.toBe("hashed-value");
  });

  test("an empty reply resolves with an empty object", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.logout();
    reply(sentCallId(postMessageSpy), null);

    await expect(promise).resolves.toEqual({});
  });

  test("'Wrong method for this mode' rejects with ModeMismatch", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.createRoom("Room", 5);
    reply(sentCallId(postMessageSpy), "Wrong method for this mode");

    await expect(promise).rejects.toMatchObject({
      code: SDKErrorCode.ModeMismatch,
      message: "createRoom is not available in manager mode",
    });
  });

  test("a rejected call still drains the next queued task", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const first = inst.getFiles();
    const second = inst.getFolders();
    expect(postMessageSpy).toHaveBeenCalledTimes(1);

    reply(sentCallId(postMessageSpy), { isError: true, status: 500, message: "boom" });
    await expect(first).rejects.toBeInstanceOf(SDKError);

    expect(postMessageSpy).toHaveBeenCalledTimes(2);
    reply(sentCallId(postMessageSpy, 1), { folders: [] });
    await expect(second).resolves.toEqual({ folders: [] });
  });

  test("ApiError does not fire onAppError", async () => {
    const onAppError = vi.fn();
    setupTarget();
    const config = makeConfig({ events: { ...defaultConfig.events, onAppError } });
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;
    iframe.dispatchEvent(new Event("load"));
    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", { value: { postMessage: postMessageSpy }, writable: true });

    const promise = inst.getFiles();
    reply(sentCallId(postMessageSpy), { isError: true, status: 500, message: "boom" });

    await expect(promise).rejects.toBeInstanceOf(SDKError);
    expect(onAppError).not.toHaveBeenCalled();
  });
});

describe("upload events — Uploader mode payloads", () => {
  const initUploader = (events: Partial<TFrameConfig["events"]>) => {
    setupTarget("ds-uploader");
    const config = makeConfig({ frameId: "ds-uploader", mode: "uploader", events: { ...defaultConfig.events, ...events } });
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;
    iframe.dispatchEvent(new Event("load"));
    return inst;
  };

  const dispatchEvent = (event: string, data: unknown) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ frameId: "ds-uploader", type: "onEventReturn", eventReturnData: { event, data } }),
        origin: BASE_SRC,
      }),
    );
  };

  test("onUploadSuccess delivers the array of API envelopes untouched", () => {
    const onUploadSuccess = vi.fn<(data: TUploadResult | TUploaderUploadResult[]) => void>();
    initUploader({ onUploadSuccess });

    const batch: TUploaderUploadResult[] = [
      { response: { id: 7, folderId: 3, version: 1, title: "a.docx", uploaded: true }, count: 1, status: 0, statusCode: 200 },
      { response: { id: 8, folderId: 3, version: 1, title: "b.pdf", uploaded: true }, count: 1, status: 0, statusCode: 200 },
    ];
    dispatchEvent("onUploadSuccess", batch);

    expect(onUploadSuccess).toHaveBeenCalledWith(batch);
  });

  test("onUploadError delivers the error with rejected files", () => {
    const onUploadError = vi.fn<(data: TUploadError | TUploaderUploadError) => void>();
    initUploader({ onUploadError });

    const payload: TUploaderUploadError = {
      error: "Some files were rejected",
      rejectedFiles: [{ fileName: "x.exe", fileSize: 10, fileType: "application/x-msdownload", errors: [{ code: "file-invalid-type", message: "Type not allowed" }] }],
    };
    dispatchEvent("onUploadError", payload);

    expect(onUploadError).toHaveBeenCalledWith(payload);
  });

  test("onUploadProgress delivers the chunk progress", () => {
    const onUploadProgress = vi.fn<(data: TUploadProgress) => void>();
    initUploader({ onUploadProgress });

    const progress: TUploadProgress = { sessionId: "s1", fileName: "a.docx", uploadedChunks: 2, totalChunks: 4, percent: 50 };
    dispatchEvent("onUploadProgress", progress);

    expect(onUploadProgress).toHaveBeenCalledWith(progress);
  });
});

describe("callId correlation", () => {
  const initWithPostMessage = () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, iframe, postMessageSpy };
  };

  const dispatchMessage = (data: object) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(data),
        origin: BASE_SRC,
      }),
    );
  };

  test("includes callId in postMessage envelope", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.getFiles();

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(typeof sent.callId).toBe("number");
    expect(sent.data.callId).toBe(sent.callId);
  });

  test("resolves correct promise when response includes matching callId", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.getFiles();

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    const callId = sent.callId;

    dispatchMessage({
      frameId: "ds-frame",
      type: "onMethodReturn",
      callId,
      methodReturnData: { files: ["matched"] },
      commandName: "getFiles",
    });

    const result = await promise;
    expect(result).toEqual({ files: ["matched"] });
  });

  test("FIFO fallback resolves oldest pending when response has no callId", async () => {
    const { inst } = initWithPostMessage();

    const promise = inst.getFiles();

    dispatchMessage({
      frameId: "ds-frame",
      type: "onMethodReturn",
      methodReturnData: { files: ["fallback"] },
      commandName: "getFiles",
    });

    const result = await promise;
    expect(result).toEqual({ files: ["fallback"] });
  });
});

describe("executeMethod before connection — SDKError rejection", () => {
  test("rejected promise is SDKError with Disconnected code", async () => {
    const onAppError = vi.fn();
    setupTarget();
    const config = makeConfig({
      events: { ...defaultConfig.events, onAppError },
    });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    let caught: unknown;
    try {
      await inst.getFiles();
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SDKError);
    expect((caught as SDKError).code).toBe(SDKErrorCode.Disconnected);
  });
});

describe("destroyFrame — destroyText safety", () => {
  test("destroyText with HTML is rendered as plain text, not parsed", () => {
    setupTarget();
    const config = makeConfig({ destroyText: "<b>removed</b>" });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    inst.destroyFrame();

    const restored = document.getElementById("ds-frame");
    expect(restored!.textContent).toBe("<b>removed</b>");
    expect(restored!.querySelector("b")).toBeNull();
  });
});

describe("getConfig — immutability", () => {
  test("mutation of returned object does not affect internal state", () => {
    setupTarget();
    const config = makeConfig({ theme: "Base" });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    const returned = inst.getConfig();
    returned.theme = "Dark";

    expect(inst.getConfig().theme).toBe("Base");
  });
});

describe("createFile", () => {
  const initWithPostMessage = () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;
    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, postMessageSpy };
  };

  test("posts folderId and title only when templateId and formId are omitted", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createFile("folder-1", "Report.docx");

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("createFile");
    expect(sent.data.data).toEqual({ folderId: "folder-1", title: "Report.docx" });
  });

  test("posts templateId and formId when given", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createFile("folder-1", "Report", "template-2", "form-3");

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data).toEqual({ folderId: "folder-1", title: "Report", templateId: "template-2", formId: "form-3" });
  });
});

describe("createRoom", () => {
  const initWithPostMessage = () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, postMessageSpy };
  };

  test("spreads options as flat fields in postMessage payload", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createRoom("Team", 1, { tags: ["x"], quota: 100 });

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data).toEqual({ title: "Team", roomType: 1, tags: ["x"], quota: 100 });
  });

  test("accepts the positional arguments of SDK 2.1 and posts them as flat fields", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const legacyCreateRoom = inst.createRoom as unknown as (...args: unknown[]) => Promise<object>;
    legacyCreateRoom.call(inst, "Team", 2, 1024, ["a", "b"], "#fff", undefined, true, false);

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data).toEqual({
      title: "Team",
      roomType: 2,
      quota: 1024,
      tags: ["a", "b"],
      color: "#fff",
      indexing: true,
      denyDownload: false,
    });
  });

  test("accepts a RoomType enum value and posts its numeric API value", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createRoom("Contracts", RoomType.Custom);

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data).toEqual({ title: "Contracts", roomType: 5 });
  });

  test("sends only title and roomType when no options given", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createRoom("Room", 2);

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data).toEqual({ title: "Room", roomType: 2 });
  });
});

describe("login", () => {
  const initWithPostMessage = () => {
    setupTarget();
    const config = makeConfig();
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, postMessageSpy };
  };

  test("login() sends only email and passwordHash when the deprecated arguments are omitted", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.login("user@example.com", "hash");

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("login");
    expect(sent.data.data).toEqual({ email: "user@example.com", passwordHash: "hash" });
  });

  test("login() posts the one-time code next to the credentials when given", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.login("user@example.com", "hash", undefined, undefined, "123456");

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("login");
    expect(sent.data.data).toEqual({ email: "user@example.com", passwordHash: "hash", code: "123456" });
  });

  test("login() resolves with the portal's answer, including a second-factor redirect", async () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    const promise = inst.login("user@example.com", "hash");
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onMethodReturn",
          callId: sent.data.callId,
          methodReturnData: { url: "/confirm/TfaAuth?key=abc", user: "user@example.com", hash: "hash" },
          commandName: "login",
        }),
        origin: BASE_SRC,
      })
    );

    await expect(promise).resolves.toEqual({ url: "/confirm/TfaAuth?key=abc", user: "user@example.com", hash: "hash" });
  });
});

describe("external data events", () => {
  const flushPromises = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

  const initConnectedInstance = (configOverrides: Partial<TFrameConfig> = {}) => {
    setupTarget();
    const config = makeConfig(configOverrides);
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;
    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, iframe, config, postMessageSpy };
  };

  const dispatchMessage = (data: object) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(data),
        origin: BASE_SRC,
      }),
    );
  };

  const dispatchGet = (commandData: object) =>
    dispatchMessage({
      frameId: "ds-frame",
      type: "onCallCommand",
      commandName: "getExternalData",
      commandData,
    });

  const dispatchSet = (commandData: object) =>
    dispatchMessage({
      frameId: "ds-frame",
      type: "onCallCommand",
      commandName: "setExternalData",
      commandData,
    });

  test("onGetExternalData receives the request and its return value is posted back", async () => {
    const onGetExternalData = vi.fn().mockReturnValue("dark");
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData },
    });

    dispatchGet({ key: "theme", callId: 7 });
    await flushPromises();

    expect(onGetExternalData).toHaveBeenCalledOnce();
    expect(onGetExternalData).toHaveBeenCalledWith({ key: "theme", callId: 7 });

    expect(postMessageSpy).toHaveBeenCalledOnce();
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent).toEqual({
      frameId: "ds-frame",
      type: "onExternalDataReturn",
      callId: 7,
      data: "dark",
    });
  });

  test("async onGetExternalData is awaited before the reply is posted", async () => {
    const onGetExternalData = vi.fn().mockResolvedValue({ value: 42 });
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData },
    });

    dispatchGet({ key: "count", callId: 11 });

    expect(postMessageSpy).not.toHaveBeenCalled();

    await flushPromises();

    expect(postMessageSpy).toHaveBeenCalledOnce();
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.callId).toBe(11);
    expect(sent.data).toEqual({ value: 42 });
  });

  test("onGetExternalData handler that throws routes the error to onAppError and posts nothing", async () => {
    const onAppError = vi.fn();
    const onGetExternalData = vi.fn().mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData, onAppError },
    });

    dispatchGet({ key: "theme", callId: 1 });
    await flushPromises();

    expect(onAppError).toHaveBeenCalledWith("storage unavailable");
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("onGetExternalData promise rejection routes the error to onAppError", async () => {
    const onAppError = vi.fn();
    const onGetExternalData = vi.fn().mockRejectedValue(new Error("backend down"));
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData, onAppError },
    });

    dispatchGet({ key: "theme", callId: 1 });
    await flushPromises();

    expect(onAppError).toHaveBeenCalledWith("backend down");
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("parallel getExternalData requests are answered with their own callIds", async () => {
    const resolvers: Record<string, (value: unknown) => void> = {};
    const onGetExternalData = vi.fn(
      (req: { key: string }) =>
        new Promise((resolve) => {
          resolvers[req.key] = resolve;
        }),
    );
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData },
    });

    dispatchGet({ key: "theme", callId: 100 });
    dispatchGet({ key: "locale", callId: 200 });

    await flushPromises();

    resolvers.locale("fr-FR");
    resolvers.theme("dark");

    await flushPromises();

    expect(postMessageSpy).toHaveBeenCalledTimes(2);
    const envelopes = postMessageSpy.mock.calls.map((call) => JSON.parse(call[0]));

    const themeReply = envelopes.find((e) => e.callId === 100);
    const localeReply = envelopes.find((e) => e.callId === 200);

    expect(themeReply).toMatchObject({ type: "onExternalDataReturn", callId: 100, data: "dark" });
    expect(localeReply).toMatchObject({ type: "onExternalDataReturn", callId: 200, data: "fr-FR" });
  });

  test("getExternalData command is a no-op when handler is not set", async () => {
    const { postMessageSpy } = initConnectedInstance();

    dispatchGet({ key: "x", callId: 1 });
    await flushPromises();

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("onSetExternalData receives {key, value} and nothing is posted back", async () => {
    const onSetExternalData = vi.fn();
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onSetExternalData },
    });

    dispatchSet({ key: "token", value: "abc123" });
    await flushPromises();

    expect(onSetExternalData).toHaveBeenCalledOnce();
    expect(onSetExternalData).toHaveBeenCalledWith({ key: "token", value: "abc123" });
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("async onSetExternalData is awaited and rejections reach onAppError", async () => {
    const onAppError = vi.fn();
    const onSetExternalData = vi.fn().mockRejectedValue(new Error("write failed"));
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onSetExternalData, onAppError },
    });

    dispatchSet({ key: "token", value: "abc" });
    await flushPromises();

    expect(onAppError).toHaveBeenCalledWith("write failed");
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("setExternalData command is a no-op when handler is not set", async () => {
    const onAppError = vi.fn();
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData: undefined, onSetExternalData: undefined, onAppError },
    });

    dispatchSet({ key: "x", value: 1 });
    await flushPromises();

    expect(onAppError).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("external data commands are blocked from a different origin", async () => {
    const onGetExternalData = vi.fn();
    const { postMessageSpy } = initConnectedInstance({
      events: { ...defaultConfig.events, onGetExternalData },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: "ds-frame",
          type: "onCallCommand",
          commandName: "getExternalData",
          commandData: { key: "x", callId: 1 },
        }),
        origin: "https://attacker.example.com",
      }),
    );

    await flushPromises();

    expect(onGetExternalData).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });
});

describe("OAuth mode", () => {
  const JWT_EXP_SECONDS = 1_700_000_000;
  const jwtWithExp = (exp: number) => {
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
  };

  const initOAuthInstance = (overrides: Partial<TFrameConfig> = {}) => {
    setupTarget();
    const config = makeConfig(overrides);
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;
    iframe.dispatchEvent(new Event("load"));

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    return { inst, iframe, postMessageSpy };
  };

  const dispatchCommand = (commandName: string, commandData?: object) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ frameId: "ds-frame", type: "onCallCommand", commandName, commandData }),
        origin: BASE_SRC,
      }),
    );
  };

  const lastAuthReturn = (spy: ReturnType<typeof vi.fn>) => {
    const call = spy.mock.calls.at(-1)!;
    return { message: JSON.parse(call[0] as string), targetOrigin: call[1] };
  };

  const flush = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  test("getAuthToken: replies with the token from getToken, correlated by callId", async () => {
    const getToken = vi.fn(() => Promise.resolve("access-token"));
    const { postMessageSpy } = initOAuthInstance({ getToken });

    dispatchCommand("getAuthToken", { callId: 7 });
    await flush();

    expect(getToken).toHaveBeenCalledTimes(1);
    const { message, targetOrigin } = lastAuthReturn(postMessageSpy);
    expect(message).toEqual({
      frameId: "ds-frame",
      type: "onAuthTokenReturn",
      callId: 7,
      data: { accessToken: "access-token" },
    });
    expect(targetOrigin).toBe(BASE_SRC);
  });

  test("getAuthToken: a static accessToken is returned as is", async () => {
    const { postMessageSpy } = initOAuthInstance({ accessToken: "static-token" });

    dispatchCommand("getAuthToken", { callId: 1 });
    await flush();

    expect(lastAuthReturn(postMessageSpy).message.data).toEqual({ accessToken: "static-token" });
  });

  test("getAuthToken: passes the JWT expiry to the frame", async () => {
    const token = jwtWithExp(JWT_EXP_SECONDS);
    const { postMessageSpy } = initOAuthInstance({ getToken: () => token });

    dispatchCommand("getAuthToken", { callId: 2 });
    await flush();

    expect(lastAuthReturn(postMessageSpy).message.data).toEqual({
      accessToken: token,
      expiresAt: JWT_EXP_SECONDS * 1000,
    });
  });

  test("getAuthToken: fires onAuthError with TOKEN_RESOLVE_FAILED when getToken rejects", async () => {
    const onAuthError = vi.fn();
    const onAppError = vi.fn();
    const { postMessageSpy } = initOAuthInstance({
      getToken: () => Promise.reject(new Error("refresh failed")),
      events: { ...defaultConfig.events, onAuthError, onAppError },
    });

    dispatchCommand("getAuthToken", { callId: 3 });
    await flush();

    expect(onAuthError).toHaveBeenCalledWith({
      code: SDKErrorCode.TokenResolveFailed,
      message: "refresh failed",
    });
    expect(onAppError).not.toHaveBeenCalled();
    const reply = lastAuthReturn(postMessageSpy).message;
    expect(reply.callId).toBe(3);
    expect(reply.data).toEqual({});
  });

  test("getAuthToken: fires onAuthError when neither getToken nor accessToken is configured", async () => {
    const onAuthError = vi.fn();
    initOAuthInstance({ events: { ...defaultConfig.events, onAuthError } });

    dispatchCommand("getAuthToken", { callId: 4 });
    await flush();

    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(onAuthError.mock.calls[0][0].code).toBe(SDKErrorCode.TokenResolveFailed);
  });

  test("login() rejects with ModeMismatch in OAuth mode without posting to the frame", async () => {
    const { inst, postMessageSpy } = initOAuthInstance({ getToken: () => "token" });

    await expect(inst.login("user@example.com", "hash")).rejects.toMatchObject({
      code: SDKErrorCode.ModeMismatch,
    });
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("logout() rejects with ModeMismatch in OAuth mode without posting to the frame", async () => {
    const { inst, postMessageSpy } = initOAuthInstance({ accessToken: "token" });

    await expect(inst.logout()).rejects.toMatchObject({ code: SDKErrorCode.ModeMismatch });
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  test("login() and logout() still post to the frame without OAuth config", () => {
    const loginInstance = initOAuthInstance();
    void loginInstance.inst.login("user@example.com", "hash");
    expect(loginInstance.postMessageSpy).toHaveBeenCalledTimes(1);
    loginInstance.inst.destroyFrame();

    const logoutInstance = initOAuthInstance();
    void logoutInstance.inst.logout();
    expect(logoutInstance.postMessageSpy).toHaveBeenCalledTimes(1);
  });

  describe("proactive refresh", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("pushes a fresh token one minute before tokenExpiresAt, without a callId", async () => {
      const tokens = ["first", "second"];
      const getToken = vi.fn(() => tokens.shift()!);
      const expiresAt = Date.now() + 5 * 60_000;
      const { postMessageSpy } = initOAuthInstance({ getToken, tokenExpiresAt: expiresAt });

      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(lastAuthReturn(postMessageSpy).message.data).toEqual({ accessToken: "first", expiresAt });

      await vi.advanceTimersByTimeAsync(4 * 60_000 - 1);
      expect(getToken).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(getToken).toHaveBeenCalledTimes(2);

      const { message } = lastAuthReturn(postMessageSpy);
      expect(message.callId).toBeUndefined();
      expect(message.type).toBe("onAuthTokenReturn");
      expect(message.data).toEqual({ accessToken: "second" });
    });

    test("uses the JWT exp claim and keeps refreshing from each new token's expiry", async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const first = jwtWithExp(nowSeconds + 300);
      const second = jwtWithExp(nowSeconds + 300 + 600);
      const tokens = [first, second, "third-opaque"];
      const getToken = vi.fn(() => tokens.shift()!);
      const { postMessageSpy } = initOAuthInstance({ getToken });

      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      expect(getToken).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(240_000);
      expect(getToken).toHaveBeenCalledTimes(2);
      expect(lastAuthReturn(postMessageSpy).message.data).toEqual({
        accessToken: second,
        expiresAt: (nowSeconds + 900) * 1000,
      });

      await vi.advanceTimersByTimeAsync(600_000);
      expect(getToken).toHaveBeenCalledTimes(3);
      expect(lastAuthReturn(postMessageSpy).message.data).toEqual({ accessToken: "third-opaque" });

      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(getToken).toHaveBeenCalledTimes(3);
    });

    test("does not schedule a refresh for a static accessToken or an opaque token", async () => {
      const staticInstance = initOAuthInstance({ accessToken: "static", tokenExpiresAt: Date.now() + 300_000 });
      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      expect(staticInstance.postMessageSpy).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(600_000);
      expect(staticInstance.postMessageSpy).toHaveBeenCalledTimes(1);
      staticInstance.inst.destroyFrame();

      const getToken = vi.fn(() => "opaque");
      const opaqueInstance = initOAuthInstance({ getToken });
      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(getToken).toHaveBeenCalledTimes(1);
      expect(opaqueInstance.postMessageSpy).toHaveBeenCalledTimes(1);
    });

    test("a token already inside the lead window is refreshed on demand only", async () => {
      const getToken = vi.fn(() => "short-lived");
      initOAuthInstance({ getToken, tokenExpiresAt: Date.now() + 30_000 });

      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(120_000);

      expect(getToken).toHaveBeenCalledTimes(1);
    });

    test("destroyFrame cancels the scheduled refresh", async () => {
      const getToken = vi.fn(() => "token");
      const { inst } = initOAuthInstance({ getToken, tokenExpiresAt: Date.now() + 300_000 });

      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      inst.destroyFrame();

      await vi.advanceTimersByTimeAsync(600_000);
      expect(getToken).toHaveBeenCalledTimes(1);
    });

    test("a failed proactive refresh fires onAuthError", async () => {
      const onAuthError = vi.fn();
      let calls = 0;
      const getToken = vi.fn(() => {
        calls += 1;
        if (calls === 1) return "first";
        throw new Error("backend down");
      });
      initOAuthInstance({
        getToken,
        tokenExpiresAt: Date.now() + 120_000,
        events: { ...defaultConfig.events, onAuthError },
      });

      dispatchCommand("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(60_000);

      expect(getToken).toHaveBeenCalledTimes(2);
      expect(onAuthError).toHaveBeenCalledWith({
        code: SDKErrorCode.TokenResolveFailed,
        message: "backend down",
      });
    });
  });
});

const initConnectedWithSpy = (overrides: Partial<TFrameConfig> = {}) => {
  setupTarget(overrides.frameId);
  const config = makeConfig(overrides);
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

const postFromFrame = (data: object, options: { origin?: string; source?: Window } = {}) => {
  const event = new MessageEvent("message", { data: JSON.stringify(data), origin: options.origin ?? BASE_SRC });
  if (options.source) Object.defineProperty(event, "source", { value: options.source });
  window.dispatchEvent(event);
};

const methodReturn = (callId: number | undefined, methodReturnData: unknown) =>
  postFromFrame({
    frameId: "ds-frame",
    type: "onMethodReturn",
    ...(callId !== undefined && { callId }),
    methodReturnData,
  });

const command = (commandName: string, commandData?: object) =>
  postFromFrame({ frameId: "ds-frame", type: "onCallCommand", commandName, commandData });

const sentTask = (spy: ReturnType<typeof vi.fn>, index: number) =>
  JSON.parse(spy.mock.calls[index][0] as string).data;

const sentCallId = (spy: ReturnType<typeof vi.fn>, index: number): number => sentTask(spy, index).callId;

const track = <T,>(promise: Promise<T>) => {
  const state = { settled: false, value: undefined as T | undefined, error: undefined as unknown };
  promise.then(
    (value) => {
      state.settled = true;
      state.value = value;
    },
    (error: unknown) => {
      state.settled = true;
      state.error = error;
    },
  );
  return state;
};

const flushMicrotasks = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

describe("methodTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("defaults to 30 seconds when unset", async () => {
    const onAppError = vi.fn();
    const { inst } = initConnectedWithSpy({ events: { ...defaultConfig.events, onAppError } });
    expect(inst.getConfig().methodTimeout).toBeUndefined();

    const call = track(inst.getFiles());

    await vi.advanceTimersByTimeAsync(29_999);
    expect(call.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(call.settled).toBe(true);
    expect(call.error).toBeInstanceOf(SDKError);
    expect((call.error as SDKError).code).toBe(SDKErrorCode.Timeout);
    expect(onAppError).toHaveBeenCalledWith("Method call timed out");
  });

  test("honours a custom value", async () => {
    const { inst } = initConnectedWithSpy({ methodTimeout: 500 });

    const call = track(inst.getFiles());

    await vi.advanceTimersByTimeAsync(499);
    expect(call.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect((call.error as SDKError).code).toBe(SDKErrorCode.Timeout);
  });

  test("clears the timer when the reply arrives in time", async () => {
    const onAppError = vi.fn();
    const { inst, postMessageSpy } = initConnectedWithSpy({
      methodTimeout: 1000,
      events: { ...defaultConfig.events, onAppError },
    });

    const call = track(inst.getFiles());
    await vi.advanceTimersByTimeAsync(100);
    methodReturn(sentCallId(postMessageSpy, 0), { files: ["in-time"] });
    await vi.advanceTimersByTimeAsync(0);

    expect(call.value).toEqual({ files: ["in-time"] });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(onAppError).not.toHaveBeenCalled();
  });

  test("sends the next queued task after a timeout", async () => {
    const { inst, postMessageSpy } = initConnectedWithSpy({ methodTimeout: 1000 });

    const first = track(inst.getFiles());
    const second = track(inst.getUserInfo());
    expect(postMessageSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect((first.error as SDKError).code).toBe(SDKErrorCode.Timeout);
    expect(postMessageSpy).toHaveBeenCalledTimes(2);
    expect(sentTask(postMessageSpy, 1).methodName).toBe("getUserInfo");

    methodReturn(sentCallId(postMessageSpy, 1), { id: "u1" });
    await vi.advanceTimersByTimeAsync(0);
    expect(second.value).toEqual({ id: "u1" });
  });

  test("a reply for a timed-out callId is dropped instead of settling the next call", async () => {
    const onAppError = vi.fn();
    const { inst, postMessageSpy } = initConnectedWithSpy({
      methodTimeout: 1000,
      events: { ...defaultConfig.events, onAppError },
    });

    const first = inst.getFiles();
    const firstId = sentCallId(postMessageSpy, 0);

    await vi.advanceTimersByTimeAsync(1000);
    await expect(first).rejects.toMatchObject({ code: SDKErrorCode.Timeout });
    expect(onAppError).toHaveBeenCalledTimes(1);

    const second = track(inst.getUserInfo());
    const secondId = sentCallId(postMessageSpy, 1);
    expect(secondId).not.toBe(firstId);

    methodReturn(firstId, { files: ["stale"] });
    await vi.advanceTimersByTimeAsync(0);
    expect(second.settled).toBe(false);

    methodReturn(secondId, { id: "u1" });
    await vi.advanceTimersByTimeAsync(0);
    expect(second.value).toEqual({ id: "u1" });
  });

  test("a reply without callId still settles the oldest pending call (FIFO fallback)", async () => {
    const { inst, postMessageSpy } = initConnectedWithSpy({ methodTimeout: 1000 });

    const first = track(inst.getFiles());
    const second = track(inst.getUserInfo());

    methodReturn(undefined, { files: ["oldest"] });
    await vi.advanceTimersByTimeAsync(0);

    expect(first.value).toEqual({ files: ["oldest"] });
    expect(second.settled).toBe(false);
    expect(sentTask(postMessageSpy, 1).methodName).toBe("getUserInfo");
  });
});

describe("OAuth token resolution", () => {
  const jwtWithExp = (exp: number) => {
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
  };

  test("a refresh further away than setTimeout allows waits in slices without calling getToken early", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    try {
      const expSeconds = Math.floor(Date.now() / 1000) + 40 * 86_400;
      const token = jwtWithExp(expSeconds);
      const getToken = vi.fn(() => token);
      const { postMessageSpy } = initConnectedWithSpy({ getToken });

      command("getAuthToken", { callId: 1 });
      await vi.advanceTimersByTimeAsync(0);
      expect(getToken).toHaveBeenCalledTimes(1);

      expect(MAX_TIMER_DELAY_MS).toBe(2 ** 31 - 1);
      await vi.advanceTimersByTimeAsync(MAX_TIMER_DELAY_MS);
      expect(getToken).toHaveBeenCalledTimes(1);

      const refreshAt = expSeconds * 1000 - TOKEN_REFRESH_LEAD_MS;
      await vi.advanceTimersByTimeAsync(refreshAt - Date.now() - 1);
      expect(getToken).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(getToken).toHaveBeenCalledTimes(2);
      const pushed = JSON.parse(postMessageSpy.mock.calls.at(-1)![0] as string);
      expect(pushed.type).toBe("onAuthTokenReturn");
      expect(pushed.callId).toBeUndefined();

      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(getToken).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("getAuthToken: concurrent commands share one getToken call and each gets its own reply", async () => {
    let resolveToken!: (token: string) => void;
    const getToken = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        }),
    );
    const { postMessageSpy } = initConnectedWithSpy({ getToken });

    command("getAuthToken", { callId: 1 });
    command("getAuthToken", { callId: 2 });
    await flushMicrotasks();

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).not.toHaveBeenCalled();

    resolveToken("shared-token");
    await flushMicrotasks();

    const replies = postMessageSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
    expect(replies.map((reply) => reply.callId)).toEqual([1, 2]);
    for (const reply of replies) {
      expect(reply.type).toBe("onAuthTokenReturn");
      expect(reply.data).toEqual({ accessToken: "shared-token" });
    }
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});

describe("setConfig command from the frame", () => {
  const SUBPATH_SRC = `${BASE_SRC}/apps`;

  test("the origin the portal reports narrows the filter but does not replace a src with a sub-path", async () => {
    const { inst, postMessageSpy } = initConnectedWithSpy({ src: SUBPATH_SRC });

    command("setConfig", { src: BASE_SRC });

    const task = sentTask(postMessageSpy, 0);
    expect(task.methodName).toBe("setConfig");
    expect(task.data.src).toBe(SUBPATH_SRC);
    expect(inst.getConfig().src).toBe(SUBPATH_SRC);

    methodReturn(undefined, {});
    await flushMicrotasks();

    const files = inst.getFiles();
    methodReturn(sentCallId(postMessageSpy, 1), { files: [] });
    await expect(files).resolves.toEqual({ files: [] });
  });

  test("instance.setConfig() without an argument keeps src and events", () => {
    const onAppError = vi.fn();
    const { inst, postMessageSpy } = initConnectedWithSpy({ events: { ...defaultConfig.events, onAppError } });

    void inst.setConfig();

    const config = inst.getConfig();
    expect(config.src).toBe(BASE_SRC);
    expect(config.frameId).toBe("ds-frame");
    expect(config.events?.onAppError).toBe(onAppError);

    const task = sentTask(postMessageSpy, 0);
    expect(task.methodName).toBe("setConfig");
    expect(task.data.src).toBe(BASE_SRC);
    expect(task.data.events.onAppError).toBe(true);
  });
});

describe("method wrappers — posted payloads", () => {
  test.each<[string, (inst: SDKInstance) => Promise<unknown>, unknown]>([
    ["getFolderInfo", (inst) => inst.getFolderInfo(), null],
    ["getSelection", (inst) => inst.getSelection(), null],
    ["getList", (inst) => inst.getList(), null],
    ["getHashSettings", (inst) => inst.getHashSettings(), null],
    ["openModal", (inst) => inst.openModal("CreateFile", { x: 1 }), { type: "CreateFile", options: { x: 1 } }],
    ["setListView", (inst) => inst.setListView("table"), { viewType: "table" }],
    ["createTag", (inst) => inst.createTag("t"), { name: "t" }],
    ["addTagsToRoom", (inst) => inst.addTagsToRoom(5, ["a"]), { roomId: 5, tags: ["a"] }],
    ["removeTagsFromRoom", (inst) => inst.removeTagsFromRoom("r", ["a"]), { roomId: "r", tags: ["a"] }],
    ["createFolder", (inst) => inst.createFolder(7, "x"), { parentFolderId: 7, title: "x" }],
    ["createFile", (inst) => inst.createFile(7, "x"), { folderId: 7, title: "x" }],
  ])("%s posts the method name and its data", (methodName, call, data) => {
    const { inst, postMessageSpy } = initConnectedWithSpy();

    void call(inst);

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(sentTask(postMessageSpy, 0)).toEqual({ type: "method", methodName, data, callId: expect.any(Number) });
  });

  test("getRooms renames search and count to the portal's filterValue and pageCount", () => {
    const { inst, postMessageSpy } = initConnectedWithSpy();

    void inst.getRooms({ search: "x", count: "5", groupId: "42", page: "2" });

    const task = sentTask(postMessageSpy, 0);
    expect(task.methodName).toBe("getRooms");
    expect(task.data).toEqual({ filterValue: "x", pageCount: "5", groupId: "42", page: "2" });
    expect(task.data).not.toHaveProperty("search");
    expect(task.data).not.toHaveProperty("count");
  });

  test("getRooms posts exactly the given fields when search and count are absent", () => {
    const { inst, postMessageSpy } = initConnectedWithSpy();

    void inst.getRooms({ groupId: "42" });

    expect(sentTask(postMessageSpy, 0).data).toEqual({ groupId: "42" });
  });

  test("executeInEditor serialises the callback with toString() next to its data", () => {
    const { inst, postMessageSpy } = initConnectedWithSpy();
    const callback = (editor: any, _asc: any, data: any) => {
      editor.insertText(data.text);
    };

    void inst.executeInEditor(callback, { text: "hi" });

    const task = sentTask(postMessageSpy, 0);
    expect(task.methodName).toBe("executeInEditor");
    expect(task.data.callback).toBe(callback.toString());
    expect(task.data.data).toEqual({ text: "hi" });
  });

  test("a function in any other method's payload is replaced by true", () => {
    const { inst, postMessageSpy } = initConnectedWithSpy();

    void inst.openModal("share", { onClose: () => undefined });

    expect(sentTask(postMessageSpy, 0).data.options.onClose).toBe(true);
  });
});

describe("message source and error envelopes", () => {
  test("a message from another window of the portal origin is ignored", async () => {
    const { inst, postMessageSpy } = initConnectedWithSpy();

    const call = track(inst.getFiles());
    const callId = sentCallId(postMessageSpy, 0);

    postFromFrame(
      { frameId: "ds-frame", type: "onMethodReturn", callId, methodReturnData: { files: ["popup"] } },
      { source: window },
    );
    await flushMicrotasks();
    expect(call.settled).toBe(false);

    methodReturn(callId, { files: ["frame"] });
    await flushMicrotasks();
    expect(call.value).toEqual({ files: ["frame"] });
  });

  test("a type:error message fires onAppError with the portal's message", () => {
    const onAppError = vi.fn();
    initConnectedWithSpy({ events: { ...defaultConfig.events, onAppError } });

    postFromFrame({ frameId: "ds-frame", type: "error", error: { message: "boom" } });

    expect(onAppError).toHaveBeenCalledTimes(1);
    expect(onAppError).toHaveBeenCalledWith("boom");
  });

  test("a non-JSON string from the frame origin fires onAppError with the parse error", () => {
    const onAppError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    initConnectedWithSpy({ events: { ...defaultConfig.events, onAppError } });

    window.dispatchEvent(new MessageEvent("message", { data: "not json {", origin: BASE_SRC }));

    expect(onAppError).toHaveBeenCalledTimes(1);
    expect(onAppError).toHaveBeenCalledWith(expect.stringMatching(/^Invalid message format: /));
    expect(consoleError).toHaveBeenCalledWith("SDK Error:", expect.any(SDKError));
  });

  test("a frameId:'error' envelope fires onAppError regardless of the frame", () => {
    const onAppError = vi.fn();
    initConnectedWithSpy({ events: { ...defaultConfig.events, onAppError } });

    postFromFrame({ frameId: "error", error: { message: "portal error" } });

    expect(onAppError).toHaveBeenCalledWith("portal error");
  });
});

describe("initFrame — src normalisation", () => {
  test("a trailing slash is stripped so the iframe URL has no double slash", () => {
    setupTarget();
    const config = makeConfig({ src: `${BASE_SRC}/` });
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    expect(inst.getConfig().src).toBe(BASE_SRC);
    expect(iframe.src.startsWith(`${BASE_SRC}/`)).toBe(true);
    expect(iframe.src.replace(/^https:\/\//, "")).not.toContain("//");
  });

  test("a sub-path in src is kept", () => {
    setupTarget();
    const config = makeConfig({ src: `${BASE_SRC}/apps/` });
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    expect(inst.getConfig().src).toBe(`${BASE_SRC}/apps`);
    expect(iframe.src.startsWith(`${BASE_SRC}/apps/rooms/shared/`)).toBe(true);
  });
});

describe("initFrame — checkCSP", () => {
  test("a failed validation fires onAppError and shows the CSP error page in the iframe", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      json: () => Promise.resolve({ response: { domains: ["https://other.example"] } }),
    } as unknown as Response);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onAppError = vi.fn();
    setupTarget();
    const config = makeConfig({ checkCSP: true, events: { ...defaultConfig.events, onAppError } });
    const inst = new SDKInstance(config);
    const iframe = inst.initFrame(config)!;

    expect(fetchSpy).toHaveBeenCalledWith(`${BASE_SRC}/api/2.0/security/csp`);
    await flushMicrotasks();

    expect(onAppError).toHaveBeenCalledWith(cspErrorText);
    expect(iframe.srcdoc).toBe(getCSPErrorBody(BASE_SRC));
  });
});

describe("destroyFrame — body style", () => {
  afterEach(() => {
    document.body.style.overscrollBehaviorY = "";
  });

  test("resets overscrollBehaviorY for a mobile frame", () => {
    setupTarget();
    const config = makeConfig({ type: "mobile" });
    const inst = new SDKInstance(config);
    inst.initFrame(config);
    expect(document.body.style.overscrollBehaviorY).toBe("contain");

    inst.destroyFrame();

    expect(document.body.style.overscrollBehaviorY).toBe("");
  });

  test("leaves the body style alone for a desktop frame", () => {
    document.body.style.overscrollBehaviorY = "contain";
    setupTarget();
    const config = makeConfig({ type: "desktop" });
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    inst.destroyFrame();

    expect(document.body.style.overscrollBehaviorY).toBe("contain");
  });
});

describe("destroyFrame / initFrame — pending calls and uploads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setupPending = async () => {
    const onAppError = vi.fn();
    const { inst, postMessageSpy, config } = initConnectedWithSpy({
      mode: "personal",
      events: { ...defaultConfig.events, onAppError },
    });

    const sent = track(inst.getFiles());
    const queued = track(inst.getUserInfo());

    const file = new File(["x"], "doc.pdf");
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(new ArrayBuffer(1)) });
    const upload = track(inst.upload(file));
    await vi.advanceTimersByTimeAsync(0);

    const uploadCalls = postMessageSpy.mock.calls.filter((call) => typeof call[0] === "object");
    expect(uploadCalls).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(2);

    return { inst, config, onAppError, pending: { sent, queued, upload } };
  };

  const expectRejectedWith = (state: ReturnType<typeof track>, message: string) => {
    expect(state.settled).toBe(true);
    expect(state.error).toBeInstanceOf(SDKError);
    expect((state.error as SDKError).code).toBe(SDKErrorCode.Disconnected);
    expect((state.error as SDKError).message).toBe(message);
  };

  test("destroyFrame rejects every pending method and upload with Disconnected and clears their timers", async () => {
    const { inst, onAppError, pending } = await setupPending();

    inst.destroyFrame();
    await vi.advanceTimersByTimeAsync(0);

    for (const state of Object.values(pending)) expectRejectedWith(state, "Frame destroyed");
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(200_000);
    expect(onAppError).not.toHaveBeenCalled();
  });

  test("initFrame rejects every pending method and upload with Disconnected and clears their timers", async () => {
    const { inst, config, onAppError, pending } = await setupPending();

    inst.initFrame(config);
    await vi.advanceTimersByTimeAsync(0);

    for (const state of Object.values(pending)) expectRejectedWith(state, "Frame reloaded");
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(200_000);
    expect(onAppError).not.toHaveBeenCalled();
  });
});
