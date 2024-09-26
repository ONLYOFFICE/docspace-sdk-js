import {
  ping,
  customUrlSearchParams,
  validateCSP,
  getConfigFromParams,
  getCSPErrorBody,
  getLoaderStyle,
} from "./utils";
import { cspErrorText, defaultConfig } from "./constants";

describe("ping", () => {
  it("should return 'pong'", () => {
    expect(ping()).toBe("pong");
  });
});

describe("customUrlSearchParams", () => {
  it("should convert an object with string values to URLSearchParams", () => {
    const params = customUrlSearchParams({ key1: "value1", key2: "value2" });
    expect(params.toString()).toBe("key1=value1&key2=value2");
  });

  it("should convert an object with number values to URLSearchParams", () => {
    const params = customUrlSearchParams({ key1: 1, key2: 2 });
    expect(params.toString()).toBe("key1=1&key2=2");
  });

  it("should convert an object with boolean values to URLSearchParams", () => {
    const params = customUrlSearchParams({ key1: true, key2: false });
    expect(params.toString()).toBe("key1=true&key2=false");
  });

  it("should handle mixed types in the object", () => {
    const params = customUrlSearchParams({
      key1: "value1",
      key2: 2,
      key3: true,
    });
    expect(params.toString()).toBe("key1=value1&key2=2&key3=true");
  });

  it("should handle empty object", () => {
    const params = customUrlSearchParams({});
    expect(params.toString()).toBe("");
  });
});

describe("validateCSP", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            response: {
              domains: [
                "test.com",
                "https://test.com/",
                "https://test.com/example",
              ],
            },
          }),
      })
    ) as jest.Mock;
  });

  it("should pass CSP validation if current origin is same as target", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "test.com",
      },
    });

    await expect(validateCSP("https://test.com")).resolves.not.toThrow();
  });

  it("should pass CSP validation if current origin is included in allowed domains", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "test.com",
      },
      writable: true,
    });

    await expect(validateCSP("https://example.com")).resolves.not.toThrow();
  });

  it("should pass CSP validation if current origin is included in allowed domains and has empty host", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "",
      },
      writable: true,
    });

    await expect(validateCSP("https://example.com")).resolves.not.toThrow();
  });

  it("should throw an error if current origin is not included in allowed domains", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://another.com",
        host: "another.com",
      },
      writable: true,
    });

    await expect(validateCSP("https://example.com")).rejects.toThrow(
      cspErrorText
    );
  });
});

describe("getConfigFromParams", () => {
  it("should return the correct config from URL parameters", () => {
    Object.defineProperty(document, "currentScript", {
      value: {
        src: "https://example.com/api.js?showHeaderBanner=none&showMenu=false&withSearch=true&count=100",
      },
      writable: true,
    });

    const result = getConfigFromParams();

    expect(result).toEqual(defaultConfig);
  });

  it("should return the correct config if URL has empty options", () => {
    Object.defineProperty(document, "currentScript", {
      value: {
        src: "https://example.com/api.js",
      },
      writable: true,
    });

    const result = getConfigFromParams();

    expect(result).toEqual(defaultConfig);
  });

  it("should return the correct config with extended options on main level of config", () => {
    Object.defineProperty(document, "currentScript", {
      value: {
        src: "https://example.com/api.js?test=value",
      },
      writable: true,
    });

    const result = getConfigFromParams();

    expect(result).toHaveProperty('test');
  });
});

describe("getCSPErrorBody", () => {
  it("should return the correct HTML string with the provided src", () => {
    const src = "https://example.com";
    const expectedHtml = `<body style=background:#f3f4f4><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"rel=stylesheet><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style=flex-shrink:0;width:211px;height:24px;position:relative><img src=${src}/static/images/logo/lightsmall.svg></div><div style=display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative><div style=flex-shrink:0;width:120px;height:100px;position:relative><img src=${src}/static/images/frame-error.svg></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href=${src}/portal-settings/developer-tools/javascript-sdk style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline"target=_blank>the Developer Tools section</a>.</span></div></div></body>`;

    const result = getCSPErrorBody(src);
    expect(result).toBe(expectedHtml);
  });

  it("should handle different src values correctly", () => {
    const src = "https://another-example.com";
    const expectedHtml = `<body style=background:#f3f4f4><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"rel=stylesheet><div style="display:flex;flex-direction:column;gap:80px;align-items:center;justify-content:flex-start;margin-top:60px;padding:0 30px"><div style=flex-shrink:0;width:211px;height:24px;position:relative><img src=${src}/static/images/logo/lightsmall.svg></div><div style=display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:flex-start;flex-shrink:0;position:relative><div style=flex-shrink:0;width:120px;height:100px;position:relative><img src=${src}/static/images/frame-error.svg></div><span style="color:#a3a9ae;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px">${cspErrorText} Please add it via <a href=${src}/portal-settings/developer-tools/javascript-sdk style="color:#4781d1;text-align:center;font-family:Open Sans;font-size:14px;font-style:normal;font-weight:700;line-height:16px;text-decoration-line:underline"target=_blank>the Developer Tools section</a>.</span></div></div></body>`;

    const result = getCSPErrorBody(src);
    expect(result).toBe(expectedHtml);
  });
});

describe("getLoaderStyle", () => {
  it("should return the correct CSS for the given class name", () => {
    const className = "loader";
    const expectedCSS = `@keyframes rotate { 0%{ transform: rotate(-45deg); } 15%{ transform: rotate(45deg); } 30%{ transform: rotate(135deg); } 45%{ transform: rotate(225deg); } 60%, 100%{ transform: rotate(315deg); } } .${className} { width: 74px; height: 74px; border: 4px solid rgba(51,51,51, 0.1); border-top-color: #333333; border-radius: 50%; transform: rotate(-45deg); position: relative; box-sizing: border-box; animation: 1s linear infinite rotate; } @media (prefers-color-scheme: dark) { .${className} { border-color: rgba(204, 204, 204, 0.1); border-top-color: #CCCCCC; } }`;

    const result = getLoaderStyle(className);
    expect(result).toBe(expectedCSS);
  });

  it("should handle different class names correctly", () => {
    const className = "spinner";
    const expectedCSS = `@keyframes rotate { 0%{ transform: rotate(-45deg); } 15%{ transform: rotate(45deg); } 30%{ transform: rotate(135deg); } 45%{ transform: rotate(225deg); } 60%, 100%{ transform: rotate(315deg); } } .${className} { width: 74px; height: 74px; border: 4px solid rgba(51,51,51, 0.1); border-top-color: #333333; border-radius: 50%; transform: rotate(-45deg); position: relative; box-sizing: border-box; animation: 1s linear infinite rotate; } @media (prefers-color-scheme: dark) { .${className} { border-color: rgba(204, 204, 204, 0.1); border-top-color: #CCCCCC; } }`;

    const result = getLoaderStyle(className);
    expect(result).toBe(expectedCSS);
  });
});
