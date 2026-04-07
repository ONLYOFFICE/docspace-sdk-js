import { vi } from "vitest";
import { SDKInstance } from "../src/instance";
import { defaultConfig } from "../src/constants";
import { SDKMode } from "../src/enums";
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
      }),
    );
    expect(path).toContain("providerName=google");
    expect(path).toContain("inviteKey=abc");
    expect(path).toContain("emplType=user");
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
  test("sends ArrayBuffer with file metadata via postMessage", async () => {
    const { inst, postMessageSpy } = initConnected();

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
    expect(payload.buffer.byteLength).toBe(4);
    const bytes = new Uint8Array(payload.buffer);
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P

    // Transferable — zero-copy
    expect(transfer).toEqual([payload.buffer]);

    // Target origin matches config.src
    expect(targetOrigin).toBe(BASE_SRC);

    // Return value
    expect(result).toEqual({ fileName: "form.pdf", fileSize: 4 });
  });

  test("throws when iframe is not connected", async () => {
    setupTarget();
    const config = makeFormsConfig();
    const inst = new SDKInstance(config);
    // Don't call initFrame — no iframe in DOM

    const file = new File(["data"], "test.pdf");
    await expect(inst.upload(file)).rejects.toThrow(
      "Frame not connected",
    );
  });

  test("bypasses the JSON serial queue (no methodName in payload)", async () => {
    const { inst, postMessageSpy } = initConnected();

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

  test("handles large files by converting the full content", async () => {
    const { inst, postMessageSpy } = initConnected();

    const size = 1024 * 1024; // 1 MB
    const content = new Uint8Array(size);
    content.fill(0x42);
    const file = new File([content], "big.pdf");

    await inst.upload(file);

    const rawCall = postMessageSpy.mock.calls.find(
      (c) => typeof c[0] === "object" && c[0]?.type === "uploadFileData",
    );
    const payload = rawCall![0];
    expect(payload.buffer.byteLength).toBe(size);
    expect(payload.fileSize).toBe(size);
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
