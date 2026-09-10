import { vi } from "vitest";
import { SDKInstance } from "../src/instance";
import { defaultConfig, FRAME_NAME } from "../src/constants";
import { SDKError, SDKErrorCode } from "../src/errors";
import type { TFrameConfig } from "../src/types";

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
    SDK: {
      init: vi.fn() as any,
      frames: {},
    },
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
    inst.initFrame({ frameId: "ds-frame", mode: "manager", src: "https://custom.example.com", checkCSP: false } as TFrameConfig);

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

  test("sends only title and roomType when no options given", () => {
    const { inst, postMessageSpy } = initWithPostMessage();

    inst.createRoom("Room", 2);

    const sent = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sent.data.data).toEqual({ title: "Room", roomType: 2 });
  });
});

describe("external data events", () => {
  const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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

  test("setExternalData command is a no-op when handler is not set", () => {
    const { postMessageSpy } = initConnectedInstance();

    expect(() => dispatchSet({ key: "x", value: 1 })).not.toThrow();
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
