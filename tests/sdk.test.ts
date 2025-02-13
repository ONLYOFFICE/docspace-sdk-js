/*
 * (c) Copyright Ascensio System SIA 2024
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
 */

jest.mock("../src/instance");

import { SDKMode } from "../src/enums";
import { SDKInstance } from "../src/instance";
import type { TFrameConfig } from "../src/types";
import { SDK } from "../src/sdk/index";

describe("SDK class", () => {
  let sdk: SDK;
  let config: TFrameConfig;

  beforeEach(() => {
    sdk = new SDK();
    config = {
      frameId: "ds-frame",
      mode: SDKMode.Viewer,
      src: "https://example.com",
    };
  });

  it("should initialize manager mode correctly", () => {
    const instance = new SDKInstance({ ...config, mode: SDKMode.Manager });
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.initManager(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith({
      ...config,
      mode: SDKMode.Manager,
    });
  });

  it("should initialize viewer mode correctly", () => {
    const instance = new SDKInstance({ ...config, mode: SDKMode.Viewer });
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.initViewer(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith({
      ...config,
      mode: SDKMode.Viewer,
    });
  });

  it("should initialize editor mode correctly", () => {
    const instance = new SDKInstance({ ...config, mode: SDKMode.Editor });
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.initEditor(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith({
      ...config,
      mode: SDKMode.Editor,
    });
  });

  it("should initialize room selector mode correctly", () => {
    const instance = new SDKInstance({ ...config, mode: SDKMode.RoomSelector });
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.initRoomSelector(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith({
      ...config,
      mode: SDKMode.RoomSelector,
    });
  });

  it("should initialize file selector mode correctly", () => {
    const instance = new SDKInstance({ ...config, mode: SDKMode.FileSelector });
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.initFileSelector(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith({
      ...config,
      mode: SDKMode.FileSelector,
    });
  });

  it("should initialize system mode correctly", () => {
    const instance = new SDKInstance({ ...config, mode: SDKMode.System });
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.initSystem(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith({
      ...config,
      mode: SDKMode.System,
    });
  });
});

describe("SDK init function", () => {
  let sdk: SDK;
  let config: TFrameConfig;

  beforeEach(() => {
    sdk = new SDK();
    config = {
      frameId: "ds-frame",
      mode: SDKMode.Viewer,
      src: "https://example.com",
    };
  });

  it("should create a new instance when frameId doesn't exist", () => {
    const instance = new SDKInstance(config);
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);

    const result = sdk.init(config);

    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith(config);
    expect(sdk.instances).toContain(instance);
    expect(sdk.frames[config.frameId]).toBe(instance);
  });

  it("should reinitialize existing instance when frameId exists", () => {
    const existingInstance = new SDKInstance(config);
    sdk.frames[config.frameId] = existingInstance;
    sdk.instances.push(existingInstance);

    const result = sdk.init(config);

    expect(result).toBe(existingInstance);
    expect(existingInstance.initFrame).toHaveBeenCalledWith(config);
    expect(sdk.instances.length).toBe(1);
    expect(sdk.frames[config.frameId]).toBe(existingInstance);
  });

  it("should maintain instances array correctly when reinitializing", () => {
    const instance = new SDKInstance(config);
    (SDKInstance as unknown as jest.Mock).mockImplementation(() => instance);
    sdk.init(config);

    const newConfig = { ...config, src: "https://new.example.com" };
    sdk.init(newConfig);

    expect(sdk.instances.length).toBe(1);
    expect(sdk.instances[0]).toBe(instance);
    expect(sdk.frames[config.frameId]).toBe(instance);
  });
});
