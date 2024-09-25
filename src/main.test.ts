import {
  ping,
  customUrlSearchParams,
  validateCSP,
  getConfigFromParams,
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
        json: () => Promise.resolve({ response: { domains: ["test.com"] } }),
      })
    ) as jest.Mock;
  });

  it("should pass CSP validation if current origin is included in allowed domains", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://test.com",
        host: "test.com",
      },
    });

    await expect(validateCSP("https://example.com")).resolves.not.toThrow();
  });

  it("should throw an error if current origin is not included in allowed domains", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://another.com",
        host: "another.com",
      },
    });

    await expect(validateCSP("https://example.com")).rejects.toThrow(
      cspErrorText
    );
  });
});

describe("getConfigFromParams", () => {
  beforeEach(() => {
    Object.defineProperty(document, "currentScript", {
      value: {
        src: "https://example.com/api.js?showHeaderBanner=none&showMenu=false&count=100",
      },
    });
  });

  it("should return the correct config from URL parameters", () => {
    const result = getConfigFromParams();

    expect(result).toEqual(defaultConfig);
  });
});
