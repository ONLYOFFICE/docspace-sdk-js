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
import { defaultConfig } from "../src/constants";
import { SDKMode } from "../src/enums";
import { SDKError, SDKErrorCode } from "../src/errors";
import type { TFrameConfig } from "../src/types";
import { getFramePath } from "../src/utils";

if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

const BASE_SRC = "https://portal.example.com";

const makeFormsConfig = (
  overrides: Partial<TFrameConfig> = {},
): TFrameConfig => ({
  ...defaultConfig,
  src: BASE_SRC,
  frameId: "ds-forms",
  mode: SDKMode.Forms,
  checkCSP: false,
  id: "room-42",
  ...overrides,
});

const setupTarget = (id = "ds-forms") => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
};

const initConnected = (overrides: Partial<TFrameConfig> = {}) => {
  setupTarget();
  const config = makeFormsConfig(overrides);
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

describe("getFramePath — Forms mode", () => {
  test("builds /sdk/forms/my-forms with roomId from config.id", () => {
    const path = getFramePath(makeFormsConfig({ id: "room-99" }));
    expect(path).toContain("/sdk/forms/my-forms");
    expect(path).toContain("roomId=room-99");
  });

  test("includes auth params when providerName is set", () => {
    const path = getFramePath(
      makeFormsConfig({
        providerName: "google",
        inviteKey: "abc",
        emplType: "user",
        uid: "user-123",
      }),
    );
    expect(path).toContain("providerName=google");
    expect(path).toContain("inviteKey=abc");
    expect(path).toContain("emplType=user");
    expect(path).toContain("uid=user-123");
  });

  test("includes showMenu param", () => {
    const withMenu = getFramePath(makeFormsConfig({ showMenu: true }));
    expect(withMenu).toContain("showMenu=true");

    const noMenu = getFramePath(makeFormsConfig({ showMenu: false }));
    expect(noMenu).toContain("showMenu=false");
  });

  test("omits undefined optional params", () => {
    const path = getFramePath(
      makeFormsConfig({
        providerName: undefined,
        inviteKey: undefined,
      }),
    );
    expect(path).not.toContain("providerName");
    expect(path).not.toContain("inviteKey");
  });

  test("includes libraryId when set", () => {
    const path = getFramePath(makeFormsConfig({ libraryId: "lib-7" }));
    expect(path).toContain("libraryId=lib-7");
  });

  test("omits libraryId when undefined", () => {
    const path = getFramePath(makeFormsConfig({ libraryId: undefined }));
    expect(path).not.toContain("libraryId");
  });

  test("includes stylesUrl when set", () => {
    const path = getFramePath(makeFormsConfig({ stylesUrl: "https://example.com/styles.css" }));
    expect(path).toContain("stylesUrl=https%3A%2F%2Fexample.com%2Fstyles.css");
  });

  test("omits stylesUrl when undefined", () => {
    const path = getFramePath(makeFormsConfig({ stylesUrl: undefined }));
    expect(path).not.toContain("stylesUrl");
  });
});

describe("navigateSection", () => {
  test("sends correct method name and section via postMessage", () => {
    const { inst, postMessageSpy } = initConnected();

    inst.navigateSection("completed-forms");

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("navigateSection");
    expect(sent.data.data).toEqual({ section: "completed-forms" });
  });

  test("resolves with iframe response", async () => {
    const { inst } = initConnected();

    const promise = inst.navigateSection("library");
    dispatchResponse("ds-forms", { section: "library" });

    const result = await promise;
    expect(result).toEqual({ section: "library" });
  });
});

describe("setCustomActions", () => {
  test("sends full config object as method data", () => {
    const { inst, postMessageSpy } = initConnected();

    const config = {
      contextMenu: {
        file: [
          { key: "export", label: "Export to CRM", icon: "https://cdn/icon.svg" },
        ],
        folder: [{ key: "share", label: "Share" }],
      },
    };

    inst.setCustomActions(config);

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("setCustomActions");
    expect(sent.data.data).toEqual(config);
  });

  test("section filter is preserved in the payload", () => {
    const { inst, postMessageSpy } = initConnected();

    inst.setCustomActions({
      contextMenu: {
        file: [
          {
            key: "approve",
            label: "Approve",
            section: ["completed-forms"],
          },
        ],
      },
    });

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data.contextMenu.file[0].section).toEqual([
      "completed-forms",
    ]);
  });
});

describe("upload", () => {
  const dispatchUploadEvent = (
    frameId: string,
    event: "onUploadSuccess" | "onUploadError",
    data: object = {},
  ) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId,
          type: "onEventReturn",
          eventReturnData: { event, data },
        }),
        origin: BASE_SRC,
      }),
    );
  };

  const autoReplyOnUpload = (
    spy: ReturnType<typeof vi.fn>,
    frameId: string,
    event: "onUploadSuccess" | "onUploadError",
    extraData: object = {},
  ) => {
    spy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string; fileName?: string };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        const data = { fileName: m.fileName, ...extraData };
        queueMicrotask(() => dispatchUploadEvent(frameId, event, data));
      }
    });
  };

  test("sends ArrayBuffer with file metadata via postMessage", async () => {
    const { inst, postMessageSpy } = initConnected();
    autoReplyOnUpload(postMessageSpy, "ds-forms", "onUploadSuccess", { fileName: "form.pdf", fileSize: 4 });

    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const file = new File([content], "form.pdf", {
      type: "application/pdf",
      lastModified: 1700000000000,
    });

    const result = await inst.upload(file);

    const rawCall = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    expect(rawCall).toBeDefined();

    const [payload, targetOrigin] = rawCall!;

    expect(payload.frameId).toBe("ds-forms");
    expect(payload.fileName).toBe("form.pdf");
    expect(payload.fileSize).toBe(4);
    expect(payload.lastModified).toBe(1700000000000);

    expect(payload.buffer).toBeInstanceOf(ArrayBuffer);

    expect(targetOrigin).toBe(BASE_SRC);

    expect(result).toEqual({ fileName: "form.pdf", fileSize: 4 });
  });

  test("rejects when iframe reports upload error", async () => {
    const { inst, postMessageSpy } = initConnected();
    autoReplyOnUpload(postMessageSpy, "ds-forms", "onUploadError", { message: "Quota exceeded" });

    const file = new File(["data"], "bad.pdf");

    await expect(inst.upload(file)).rejects.toThrow("Quota exceeded");
  });

  test("throws when bus is not connected", async () => {
    setupTarget();
    const config = makeFormsConfig();
    const inst = new SDKInstance(config);

    const file = new File(["data"], "test.pdf");
    await expect(inst.upload(file)).rejects.toThrow(
      "Message bus is not connected with frame",
    );
  });

  test("bypasses the JSON serial queue (no methodName in payload)", async () => {
    const { inst, postMessageSpy } = initConnected();
    autoReplyOnUpload(postMessageSpy, "ds-forms", "onUploadSuccess", {});

    const file = new File(["test"], "doc.pdf");

    await inst.upload(file);

    const rawCall = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    expect(rawCall).toBeDefined();
    const payload = rawCall![0];

    expect(payload.data).toBeUndefined();
    expect(payload.methodName).toBeUndefined();

    expect(payload.type).toBe("uploadFileData");
    expect(payload.buffer).toBeInstanceOf(ArrayBuffer);
  });

  test("resolves concurrent uploads independently by fileName", async () => {
    const { inst, postMessageSpy } = initConnected();

    postMessageSpy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string; fileName?: string; fileSize?: number };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        queueMicrotask(() =>
          dispatchUploadEvent("ds-forms", "onUploadSuccess", {
            fileName: m.fileName,
            fileSize: m.fileSize,
          }),
        );
      }
    });

    const fileA = new File(["aaa"], "report.pdf");
    const fileB = new File(["bb"], "invoice.pdf");

    const [resultA, resultB] = await Promise.all([
      inst.upload(fileA),
      inst.upload(fileB),
    ]);

    expect(resultA).toEqual(expect.objectContaining({ fileName: "report.pdf" }));
    expect(resultB).toEqual(expect.objectContaining({ fileName: "invoice.pdf" }));
  });

  test("resolves two uploads with the same file name independently (FIFO)", async () => {
    const { inst, postMessageSpy } = initConnected();

    let callCount = 0;
    postMessageSpy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string; fileName?: string };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        callCount++;
        const n = callCount;
        queueMicrotask(() =>
          dispatchUploadEvent("ds-forms", "onUploadSuccess", {
            fileName: m.fileName,
            batch: n,
          }),
        );
      }
    });

    const fileA = new File(["v1"], "report.pdf");
    const fileB = new File(["v2"], "report.pdf");

    const [resultA, resultB] = await Promise.all([
      inst.upload(fileA),
      inst.upload(fileB),
    ]);

    expect((resultA as { batch: number }).batch).toBe(1);
    expect((resultB as { batch: number }).batch).toBe(2);
  });

  test("resolves oldest pending when iframe response has no fileName", async () => {
    const { inst, postMessageSpy } = initConnected();

    postMessageSpy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        queueMicrotask(() =>
          dispatchUploadEvent("ds-forms", "onUploadSuccess", { status: "ok" }),
        );
      }
    });

    const result = await inst.upload(new File(["x"], "doc.pdf"));

    expect(result).toEqual(expect.objectContaining({ status: "ok" }));
  });

  test("does not resolve pending upload when event has a non-matching fileName", async () => {
    const { inst } = initConnected();

    const file = new File(["data"], "mine.pdf");
    const promise = inst.upload(file);

    dispatchUploadEvent("ds-forms", "onUploadSuccess", {
      fileName: "someone-elses-file.pdf",
    });

    const timeout = new Promise((r) => {
      setTimeout(() => r("timeout"), 50);
    });
    const winner = await Promise.race([promise, timeout]);
    expect(winner).toBe("timeout");

    dispatchUploadEvent("ds-forms", "onUploadSuccess", { fileName: "mine.pdf" });
    const result = await promise;
    expect(result).toEqual(expect.objectContaining({ fileName: "mine.pdf" }));
  });

  test("ignores upload events for files not in pending queue", () => {
    const onUploadSuccess = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onUploadSuccess } });

    dispatchUploadEvent("ds-forms", "onUploadSuccess", {
      fileName: "manual-drag.pdf",
    });

    expect(onUploadSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "manual-drag.pdf" }),
    );
  });

  test("handles large files by converting the full content", async () => {
    const { inst, postMessageSpy } = initConnected();

    const size = 1024 * 1024;
    const content = new Uint8Array(size);
    content.fill(0x42);
    const file = new File([content], "big.pdf");

    autoReplyOnUpload(postMessageSpy, "ds-forms", "onUploadSuccess", {});

    await inst.upload(file);

    const rawCall = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    const payload = rawCall![0];
    expect(payload.buffer.byteLength).toBe(size);
    expect(payload.fileSize).toBe(size);
  });

  test("handles 0-byte empty file", async () => {
    const { inst, postMessageSpy } = initConnected();
    autoReplyOnUpload(postMessageSpy, "ds-forms", "onUploadSuccess", {});

    const file = new File([], "empty.pdf");
    const result = await inst.upload(file);

    const rawCall = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    expect(rawCall).toBeDefined();
    const payload = rawCall![0];
    expect(payload.buffer.byteLength).toBe(0);
    expect(payload.fileSize).toBe(0);
    expect(payload.fileName).toBe("empty.pdf");
    expect(result).toEqual(expect.objectContaining({ fileName: "empty.pdf" }));
  });
});

describe("Forms events", () => {
  const dispatchEvent = (
    frameId: string,
    event: string,
    data: object = {},
  ) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId,
          type: "onEventReturn",
          eventReturnData: { event, data },
        }),
        origin: BASE_SRC,
      }),
    );
  };

  test("onNavigate fires when iframe reports section change", () => {
    const onNavigate = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onNavigate } });

    dispatchEvent("ds-forms", "onNavigate", { section: "completed-forms" });

    expect(onNavigate).toHaveBeenCalledWith({ section: "completed-forms" });
  });

  test("onUploadSuccess fires after successful upload", () => {
    const onUploadSuccess = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onUploadSuccess } });

    dispatchEvent("ds-forms", "onUploadSuccess", {
      fileName: "report.pdf",
      fileSize: 1024,
    });

    expect(onUploadSuccess).toHaveBeenCalledWith({
      fileName: "report.pdf",
      fileSize: 1024,
    });
  });

  test("onUploadError fires on upload failure", () => {
    const onUploadError = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onUploadError } });

    dispatchEvent("ds-forms", "onUploadError", {
      fileName: "broken.pdf",
      message: "Network error",
    });

    expect(onUploadError).toHaveBeenCalledWith({
      fileName: "broken.pdf",
      message: "Network error",
    });
  });

  test("onCustomAction fires with action key and item data", () => {
    const onCustomAction = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onCustomAction } });

    dispatchEvent("ds-forms", "onCustomAction", {
      action: "send-to-crm",
      type: "file",
      item: { id: 42, title: "Invoice.pdf" },
    });

    expect(onCustomAction).toHaveBeenCalledWith({
      action: "send-to-crm",
      type: "file",
      item: { id: 42, title: "Invoice.pdf" },
    });
  });

  test("events for wrong frameId are ignored", () => {
    const onNavigate = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onNavigate } });

    dispatchEvent("wrong-frame", "onNavigate", { section: "library" });

    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe("navigateSection — mode guard", () => {
  test("rejects with SDKError ModeMismatch when called outside Forms mode", async () => {
    const el = document.createElement("div");
    el.id = "ds-manager";
    document.body.appendChild(el);

    const config: TFrameConfig = {
      ...defaultConfig,
      src: BASE_SRC,
      frameId: "ds-manager",
      mode: "manager",
      checkCSP: false,
    };
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    let caught: unknown;
    try {
      await inst.navigateSection("library");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SDKError);
    expect((caught as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
  });

  test("does not throw synchronously — the guard is observable through .catch()", async () => {
    setupTarget("ds-manager");
    const config: TFrameConfig = { ...defaultConfig, src: BASE_SRC, frameId: "ds-manager", mode: "manager", checkCSP: false };
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    const onCatch = vi.fn();
    const promise = inst.navigateSection("library").catch(onCatch);
    await promise;

    expect(onCatch).toHaveBeenCalledTimes(1);
    expect((onCatch.mock.calls[0][0] as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
  });
});

describe("setCustomActions — Manager and Personal", () => {
  test.each(["manager", "personal"] as const)("is sent in %s mode", (mode) => {
    const { inst, postMessageSpy } = initConnected({ mode });

    const config = {
      contextMenu: { room: [{ key: "unlink", label: "Unlink", roomTypes: [5] }] },
      createMenu: [{ key: "upload", label: "Upload from CRM" }],
    };
    inst.setCustomActions(config);

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("setCustomActions");
    expect(sent.data.data).toEqual(config);
  });

  test("sends TFrameConfig.customActions to the frame when it requests the config", () => {
    const customActions = { contextMenu: { file: [{ key: "send", label: "Send to CRM" }] } };
    const { postMessageSpy, config } = initConnected({ mode: "manager", customActions });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          frameId: config.frameId,
          type: "onCallCommand",
          commandName: "setConfig",
          commandData: { src: new URL(BASE_SRC).origin },
        }),
        origin: new URL(BASE_SRC).origin,
      }),
    );

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.methodName).toBe("setConfig");
    expect(sent.data.data.customActions).toEqual(customActions);
    expect(sent.data.data.src).toBe(BASE_SRC);
    expect(sent.data.data.events).toBeDefined();
  });

  test("keeps the applied set in the config so a reload sends it again", async () => {
    const { inst, config: frameConfig } = initConnected({ mode: "manager" });

    const config = { createMenu: [{ key: "upload", label: "Upload from CRM" }] };
    const pending = inst.setCustomActions(config);
    dispatchResponse(frameConfig.frameId);
    await pending;

    expect(inst.getConfig().customActions).toEqual(config);
  });
});

describe("setCustomActions — mode guard", () => {
  test.each([
    "editor",
    "viewer",
    "system",
    "room-selector",
    "file-selector",
    "public-room",
    "uploader",
    "chat",
  ] as const)("rejects with SDKError ModeMismatch in %s mode", async (mode) => {
    const el = document.createElement("div");
    el.id = `ds-${mode}`;
    document.body.appendChild(el);

    const config: TFrameConfig = {
      ...defaultConfig,
      src: BASE_SRC,
      frameId: `ds-${mode}`,
      mode,
      checkCSP: false,
    };
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    let caught: unknown;
    try {
      await inst.setCustomActions({ contextMenu: {} });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SDKError);
    expect((caught as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
  });
});

describe("upload — uploadId correlation", () => {
  const dispatchUploadEvent = (event: "onUploadSuccess" | "onUploadError", data: object) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ frameId: "ds-forms", type: "onEventReturn", eventReturnData: { event, data } }),
        origin: BASE_SRC,
      }),
    );
  };

  const makeFile = (name: string) => {
    const file = new File(["x"], name);
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(new ArrayBuffer(1)) });
    return file;
  };

  const uploadMessages = (spy: ReturnType<typeof vi.fn>) =>
    spy.mock.calls
      .map((call) => call[0] as { type?: string; uploadId?: number; fileName?: string })
      .filter((message) => typeof message === "object" && message.type === "uploadFileData");

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

  const flush = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

  test("every uploadFileData message carries an increasing uploadId", async () => {
    const { inst, postMessageSpy } = initConnected();

    const first = track(inst.upload(makeFile("a.pdf")));
    const second = track(inst.upload(makeFile("b.pdf")));
    await flush();

    expect(uploadMessages(postMessageSpy).map((message) => message.uploadId)).toEqual([1, 2]);

    dispatchUploadEvent("onUploadSuccess", { fileName: "a.pdf", uploadId: 1 });
    dispatchUploadEvent("onUploadSuccess", { fileName: "b.pdf", uploadId: 2 });
    await flush();

    expect(first.value).toEqual({ fileName: "a.pdf", uploadId: 1 });
    expect(second.value).toEqual({ fileName: "b.pdf", uploadId: 2 });
  });

  test("an event with uploadId resolves that upload even when both files share a name", async () => {
    const { inst } = initConnected();

    const first = track(inst.upload(makeFile("report.pdf")));
    const second = track(inst.upload(makeFile("report.pdf")));
    await flush();

    dispatchUploadEvent("onUploadSuccess", { fileName: "report.pdf", uploadId: 2, batch: "second" });
    await flush();

    expect(second.value).toEqual({ fileName: "report.pdf", uploadId: 2, batch: "second" });
    expect(first.settled).toBe(false);

    dispatchUploadEvent("onUploadSuccess", { fileName: "report.pdf", uploadId: 1, batch: "first" });
    await flush();

    expect(first.value).toEqual({ fileName: "report.pdf", uploadId: 1, batch: "first" });
  });

  test("an event without uploadId still matches by fileName", async () => {
    const { inst } = initConnected();

    const first = track(inst.upload(makeFile("a.pdf")));
    const second = track(inst.upload(makeFile("b.pdf")));
    await flush();

    dispatchUploadEvent("onUploadSuccess", { fileName: "b.pdf" });
    await flush();

    expect(second.value).toEqual({ fileName: "b.pdf" });
    expect(first.settled).toBe(false);

    dispatchUploadEvent("onUploadError", { fileName: "a.pdf", message: "Quota exceeded" });
    await flush();

    expect(first.error).toBeInstanceOf(SDKError);
    expect((first.error as SDKError).code).toBe(SDKErrorCode.UploadFailed);
    expect((first.error as SDKError).message).toBe("Quota exceeded");
  });

  test("an unknown uploadId falls back to the fileName match", async () => {
    const { inst } = initConnected();

    const upload = track(inst.upload(makeFile("a.pdf")));
    await flush();

    dispatchUploadEvent("onUploadSuccess", { fileName: "a.pdf", uploadId: 99 });
    await flush();

    expect(upload.value).toEqual({ fileName: "a.pdf", uploadId: 99 });
  });

  test("a postMessage failure rejects with UploadFailed and leaves no timer behind", async () => {
    vi.useFakeTimers();
    try {
      const { inst, postMessageSpy } = initConnected();
      postMessageSpy.mockImplementationOnce(() => {
        throw new Error("DataCloneError");
      });

      const failed = track(inst.upload(makeFile("x.pdf")));
      await vi.advanceTimersByTimeAsync(0);

      expect(failed.settled).toBe(true);
      expect(failed.error).toBeInstanceOf(SDKError);
      expect((failed.error as SDKError).code).toBe(SDKErrorCode.UploadFailed);
      expect((failed.error as SDKError).message).toBe("DataCloneError");
      expect(vi.getTimerCount()).toBe(0);

      const next = track(inst.upload(makeFile("y.pdf")));
      await vi.advanceTimersByTimeAsync(0);
      expect(uploadMessages(postMessageSpy).at(-1)!.uploadId).toBe(2);

      dispatchUploadEvent("onUploadSuccess", { fileName: "y.pdf", uploadId: 2 });
      await vi.advanceTimersByTimeAsync(0);
      expect(next.value).toEqual({ fileName: "y.pdf", uploadId: 2 });

      await vi.advanceTimersByTimeAsync(120_000);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
