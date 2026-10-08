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

const SCRIPT_SRC =
  "https://example.com/api.js?init=true&src=https://portal.example.com&mode=manager&frameId=ds-frame&checkCSP=false";

const setCurrentScript = (script: HTMLScriptElement | null) => {
  Object.defineProperty(document, "currentScript", { value: script, configurable: true });
};

describe("browser entry (api.js)", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    Reflect.deleteProperty(window, "DocSpace");
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    setCurrentScript(null);
    vi.unstubAllGlobals();
  });

  test("auto-initializes the frame from the script tag query when init=true", async () => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    setCurrentScript(script);

    const target = document.createElement("div");
    target.id = "ds-frame";
    document.body.appendChild(target);

    await import("../src/main.browser");
    const { SDK } = await import("../src/sdk");

    expect(window.DocSpace.SDK).toBeInstanceOf(SDK);

    const instance = window.DocSpace.SDK.frames["ds-frame"];
    expect(instance).toBeDefined();
    expect(instance.getConfig()).toMatchObject({
      src: "https://portal.example.com",
      mode: "manager",
      frameId: "ds-frame",
      checkCSP: false,
    });
    expect(document.querySelector("iframe#ds-frame")).not.toBeNull();
  });

  test("without a current script the import does not throw and still exposes the SDK", async () => {
    setCurrentScript(null);

    await expect(import("../src/main.browser")).resolves.toBeDefined();
    const { SDK } = await import("../src/sdk");

    expect(window.DocSpace.SDK).toBeInstanceOf(SDK);
    expect(window.DocSpace.SDK.frames).toEqual({});
  });
});
