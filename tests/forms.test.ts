import { vi } from "vitest";
import { SDKInstance } from "../src/instance";
import { defaultConfig } from "../src/constants";
import { SDKMode } from "../src/enums";
import { SDKError, SDKErrorCode } from "../src/errors";
import type { TFrameConfig } from "../src/types";
import { getFramePath } from "../src/utils";

// jsdom doesn't implement Blob.arrayBuffer — polyfill for tests
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

const BASE_SRC = "https://docspace.example.com";

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
  window.DocSpace = { SDK: { init: vi.fn() as any, frames: {} } };
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getFramePath — Forms mode URL construction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// navigateSection — JSON protocol method
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// setCustomActions — JSON protocol method
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// upload — binary transfer via Transferable postMessage
// ---------------------------------------------------------------------------

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

  /** Configures postMessageSpy to auto-dispatch an upload event when uploadFileData is sent. */
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

    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const file = new File([content], "form.pdf", {
      type: "application/pdf",
      lastModified: 1700000000000,
    });

    const result = await inst.upload(file);

    // upload sends raw postMessage (not JSON-stringified)
    const rawCall = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    expect(rawCall).toBeDefined();

    const [payload, targetOrigin, transfer] = rawCall!;

    // Metadata
    expect(payload.frameId).toBe("ds-forms");
    expect(payload.fileName).toBe("form.pdf");
    expect(payload.fileSize).toBe(4);
    expect(payload.lastModified).toBe(1700000000000);

    // Binary data as ArrayBuffer
    expect(payload.buffer).toBeInstanceOf(ArrayBuffer);

    // Target origin matches config.src
    expect(targetOrigin).toBe(BASE_SRC);

    // Return value comes from iframe confirmation
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
    // Don't call initFrame — #isConnected is false

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

    // Must NOT have the JSON protocol envelope
    expect(payload.data).toBeUndefined();
    expect(payload.methodName).toBeUndefined();

    // Must have the binary protocol marker
    expect(payload.type).toBe("uploadFileData");
    expect(payload.buffer).toBeInstanceOf(ArrayBuffer);
  });

  test("resolves concurrent uploads independently by fileName", async () => {
    const { inst, postMessageSpy } = initConnected();

    // Auto-reply with matching fileName for each upload
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

    // FIFO: first upload gets first response, second gets second
    expect((resultA as { batch: number }).batch).toBe(1);
    expect((resultB as { batch: number }).batch).toBe(2);
  });

  test("resolves oldest pending when iframe response has no fileName", async () => {
    const { inst, postMessageSpy } = initConnected();

    postMessageSpy.mockImplementation((msg: unknown) => {
      const m = msg as { type?: string };
      if (typeof msg === "object" && m.type === "uploadFileData") {
        // Simulate iframe that does NOT include fileName in response
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

    // Simulate drag-and-drop upload event for a DIFFERENT file
    dispatchUploadEvent("ds-forms", "onUploadSuccess", {
      fileName: "someone-elses-file.pdf",
    });

    // Promise should still be pending — verify by racing with a short timer
    const timeout = new Promise((r) => setTimeout(() => r("timeout"), 50));
    const winner = await Promise.race([promise, timeout]);
    expect(winner).toBe("timeout");

    // Now send the matching event to clean up
    dispatchUploadEvent("ds-forms", "onUploadSuccess", { fileName: "mine.pdf" });
    const result = await promise;
    expect(result).toEqual(expect.objectContaining({ fileName: "mine.pdf" }));
  });

  test("ignores upload events for files not in pending queue", () => {
    const onUploadSuccess = vi.fn();
    initConnected({ events: { ...defaultConfig.events, onUploadSuccess } });

    // Dispatch an upload event without calling upload() — no pending promise
    dispatchUploadEvent("ds-forms", "onUploadSuccess", {
      fileName: "manual-drag.pdf",
    });

    // User's event handler should still fire
    expect(onUploadSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "manual-drag.pdf" }),
    );
  });


  test("handles large files by converting the full content", async () => {
    const { inst, postMessageSpy } = initConnected();

    const size = 1024 * 1024; // 1 MB
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

// ---------------------------------------------------------------------------
// Forms events — iframe → host notifications
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ModeMismatch guards — navigateSection and setCustomActions outside Forms
// ---------------------------------------------------------------------------

describe("navigateSection — mode guard", () => {
  test("throws SDKError with ModeMismatch when called outside Forms mode", () => {
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
      inst.navigateSection("library");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SDKError);
    expect((caught as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
  });
});

describe("setCustomActions — mode guard", () => {
  test("throws SDKError with ModeMismatch when called outside Forms mode", () => {
    const el = document.createElement("div");
    el.id = "ds-editor";
    document.body.appendChild(el);

    const config: TFrameConfig = {
      ...defaultConfig,
      src: BASE_SRC,
      frameId: "ds-editor",
      mode: "editor",
      checkCSP: false,
    };
    const inst = new SDKInstance(config);
    inst.initFrame(config);

    let caught: unknown;
    try {
      inst.setCustomActions({ contextMenu: {} });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SDKError);
    expect((caught as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
  });
});
