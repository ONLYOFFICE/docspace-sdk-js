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

import * as pkg from "../src/main";
import { SDK } from "../src/sdk";
import { SDKInstance } from "../src/instance";
import { SDKError, SDKErrorCode } from "../src/errors";
import { SDKMode } from "../src/enums";
import { defaultConfig } from "../src/constants";

describe("package entry exports", () => {
  it("exports SDK by name, as the README and the examples import it", () => {
    expect(pkg.SDK).toBe(SDK);
  });

  it("keeps SDK as the default export", () => {
    expect(pkg.default).toBe(SDK);
  });

  it("exports the public classes, enums and constants", () => {
    expect(pkg.SDKInstance).toBe(SDKInstance);
    expect(pkg.SDKError).toBe(SDKError);
    expect(pkg.SDKErrorCode).toBe(SDKErrorCode);
    expect(pkg.SDKMode).toBe(SDKMode);
    expect(pkg.defaultConfig).toBe(defaultConfig);
  });

  it("registers a shared instance on window.DocSpace.SDK", () => {
    expect(window.DocSpace?.SDK).toBeInstanceOf(SDK);
  });
});
