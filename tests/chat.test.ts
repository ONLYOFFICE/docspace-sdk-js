import { vi } from "vitest";
import { SDK } from "../src/sdk";
import { SDKInstance } from "../src/instance";
import { defaultConfig } from "../src/constants";
import { SDKMode } from "../src/enums";
import { SDKError, SDKErrorCode } from "../src/errors";
import type { TFrameConfig } from "../src/types";
import { getFramePath } from "../src/utils";

const BASE_SRC = "https://docspace.example.com";

const makeChatConfig = (
  overrides: Partial<TFrameConfig> = {},
): TFrameConfig => ({
  ...defaultConfig,
  src: BASE_SRC,
  frameId: "ds-chat",
  mode: SDKMode.Chat,
  checkCSP: false,
  agentId: 42,
  ...overrides,
});

const setupTarget = (id = "ds-chat") => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
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

describe("getFramePath — Chat mode", () => {
  test("builds /sdk/chat with agentId", () => {
    const path = getFramePath(makeChatConfig());
    expect(path.startsWith("/sdk/chat")).toBe(true);
    expect(path).toContain("agentId=42");
  });

  test("includes fileId and threadId when set", () => {
    const path = getFramePath(
      makeChatConfig({ fileId: 99, threadId: "thread-abc" }),
    );
    expect(path).toContain("fileId=99");
    expect(path).toContain("threadId=thread-abc");
  });

  test("omits falsy optional params", () => {
    const path = getFramePath(
      makeChatConfig({ fileId: undefined, threadId: "" }),
    );
    expect(path).not.toContain("fileId");
    expect(path).not.toContain("threadId");
  });

  test("builds a user-bound chat path when agentId is omitted", () => {
    const path = getFramePath(makeChatConfig({ agentId: undefined }));
    expect(path.startsWith("/sdk/chat")).toBe(true);
    expect(path).not.toContain("agentId");
  });

  test("includes headerOffset and headerHeight when set", () => {
    const path = getFramePath(
      makeChatConfig({ headerOffset: 48, headerHeight: 64 }),
    );
    expect(path).toContain("headerOffset=48");
    expect(path).toContain("headerHeight=64");
  });

  test("includes theme and locale from baseFrameOptions", () => {
    const path = getFramePath(
      makeChatConfig({ theme: "Dark", locale: "fr-FR" }),
    );
    expect(path).toContain("theme=Dark");
    expect(path).toContain("locale=fr-FR");
  });

  test("adds auth=oauth when a token provider is configured", () => {
    const withGetToken = getFramePath(
      makeChatConfig({ getToken: async () => "token" }),
    );
    expect(withGetToken).toContain("auth=oauth");

    const withAccessToken = getFramePath(
      makeChatConfig({ accessToken: "token" }),
    );
    expect(withAccessToken).toContain("auth=oauth");

    const withoutToken = getFramePath(makeChatConfig());
    expect(withoutToken).not.toContain("auth=oauth");
  });

  test("includes auth params when providerName is set", () => {
    const path = getFramePath(
      makeChatConfig({
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
    const path = getFramePath(makeChatConfig());
    expect(path).not.toContain("providerName");
    expect(path).not.toContain("inviteKey");
    expect(path).not.toContain("emplType");
    expect(path).not.toContain("uid=");
  });
});

describe("SDK.initChat", () => {
  test("forces mode to chat", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initChat({
      ...makeChatConfig(),
      mode: SDKMode.Manager,
    });

    expect(instance.config.mode).toBe(SDKMode.Chat);
  });

  test("keeps default noLoader=true (no chat-specific overrides)", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initChat(makeChatConfig());

    expect(instance.config.noLoader).toBe(true);
  });

  test("iframe src points at /sdk/chat with the agentId", () => {
    setupTarget();
    const sdk = new SDK();
    const instance = sdk.initChat(makeChatConfig({ agentId: 7 }));

    const iframe = document.getElementById(
      "ds-chat",
    ) as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain("/sdk/chat");
    expect(iframe!.src).toContain("agentId=7");
    expect(instance.config.agentId).toBe(7);
  });
});

describe("mode-guarded methods — Chat mode", () => {
  const initChatInstance = () => {
    setupTarget();
    const config = makeChatConfig();
    const inst = new SDKInstance(config);
    inst.initFrame(config);
    return inst;
  };

  test("navigateSection throws SDKError with ModeMismatch", () => {
    const inst = initChatInstance();

    expect(() => inst.navigateSection("my-documents")).toThrow(SDKError);
    try {
      inst.navigateSection("my-documents");
    } catch (e) {
      expect((e as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
    }
  });

  test("setCustomActions throws SDKError with ModeMismatch", () => {
    const inst = initChatInstance();

    expect(() => inst.setCustomActions([])).toThrow(SDKError);
    try {
      inst.setCustomActions([]);
    } catch (e) {
      expect((e as SDKError).code).toBe(SDKErrorCode.ModeMismatch);
    }
  });
});
