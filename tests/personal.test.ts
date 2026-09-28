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
// getFramePath — Personal mode URL construction
// ---------------------------------------------------------------------------

describe("getFramePath — Personal mode", () => {
  test("builds /sdk/personal-files/my-documents by default", () => {
    const path = getFramePath(makePersonalConfig());
    expect(path.startsWith("/sdk/personal-files/my-documents")).toBe(true);
  });

  test("uses personalDestination override when provided", () => {
    const path = getFramePath(
      makePersonalConfig({ personalDestination: "favorites" }),
    );
    expect(path.startsWith("/sdk/personal-files/favorites")).toBe(true);
  });

  test("supports all section values", () => {
    const sections = [
      "my-documents",
      "favorites",
      "recent",
      "trash",
      "settings",
    ] as const;

    for (const section of sections) {
      const path = getFramePath(
        makePersonalConfig({ personalDestination: section }),
      );
      expect(path).toContain(`/sdk/personal-files/${section}`);
    }
  });

  test("includes id when set", () => {
    const path = getFramePath(makePersonalConfig({ id: "folder-42" }));
    expect(path).toContain("id=folder-42");
  });

  test("includes showMenu flag", () => {
    const withMenu = getFramePath(makePersonalConfig({ showMenu: true }));
    expect(withMenu).toContain("showMenu=true");

    const noMenu = getFramePath(makePersonalConfig({ showMenu: false }));
    expect(noMenu).toContain("showMenu=false");
  });

  test("includes infoPanelVisible flag", () => {
    const visible = getFramePath(
      makePersonalConfig({ infoPanelVisible: true }),
    );
    expect(visible).toContain("infoPanelVisible=true");

    const hidden = getFramePath(
      makePersonalConfig({ infoPanelVisible: false }),
    );
    expect(hidden).toContain("infoPanelVisible=false");
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

// ---------------------------------------------------------------------------
// SDK.initPersonal — wrapper
// ---------------------------------------------------------------------------

describe("SDK.initPersonal", () => {
  test("forces mode to personal and defaults showMenu/infoPanelVisible to true", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initPersonal({
      ...makePersonalConfig(),
      showMenu: undefined as unknown as boolean,
      infoPanelVisible: undefined as unknown as boolean,
    });

    expect(instance.config.mode).toBe(SDKMode.Personal);
    expect(instance.config.showMenu).toBe(true);
    expect(instance.config.infoPanelVisible).toBe(true);
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

// ---------------------------------------------------------------------------
// navigateSection — now supports Personal mode
// ---------------------------------------------------------------------------

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
