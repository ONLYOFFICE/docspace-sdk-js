import { vi } from "vitest";
import { SDKInstance } from "../src/instance";
import { defaultConfig, FRAME_NAME } from "../src/constants";
import type { TFrameConfig } from "../src/types";

const BASE_SRC = "https://docspace.example.com";

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
