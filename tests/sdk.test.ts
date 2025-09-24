/**
 * (c) Copyright Ascensio System SIA 2025
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

jest.mock("../src/instance");

import { SDKMode } from "../src/enums";
import { SDKInstance } from "../src/instance";
import type { TFrameConfig } from "../src/types";
import { SDK } from "../src/sdk/index";

type MockInst = { initFrame: jest.Mock; config?: TFrameConfig } & Record<
  string,
  unknown
>;

const mockInstanceFactory = (): MockInst => ({
  initFrame: jest.fn(),
  config: undefined,
});

const setMockReturn = (instance: MockInst) => {
  (SDKInstance as unknown as jest.Mock).mockReturnValue(instance as any);
  return instance;
};

describe("SDK class wrappers", () => {
  let sdk: SDK;
  let baseConfig: TFrameConfig;

  beforeEach(() => {
    sdk = new SDK();
    baseConfig = {
      frameId: "ds-frame",
      mode: SDKMode.Viewer,
      src: "https://example.com",
    };
    (SDKInstance as unknown as jest.Mock).mockReset();
  });

  test.each([
    ["initManager", SDKMode.Manager],
    ["initViewer", SDKMode.Viewer],
    ["initEditor", SDKMode.Editor],
    ["initRoomSelector", SDKMode.RoomSelector],
    ["initFileSelector", SDKMode.FileSelector],
    ["initSystem", SDKMode.System],
  ])("%s sets mode to %s and calls initFrame", (methodName, mode) => {
    const instance = setMockReturn(mockInstanceFactory());
    const result = (sdk as any)[methodName]({ ...baseConfig, mode: "WRONG" });
    expect(result).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledTimes(1);
    const calledWith = instance.initFrame.mock.calls[0][0];
    expect(calledWith.mode).toBe(mode);
    expect(sdk.frames[baseConfig.frameId]).toBe(instance);
  });

  test("initFrame alias delegates to init", () => {
    const instance = setMockReturn(mockInstanceFactory());
    const out = sdk.initFrame(baseConfig);
    expect(out).toBe(instance);
    expect(instance.initFrame).toHaveBeenCalledWith(baseConfig);
  });

  test("reusing same frameId with different wrapper keeps same instance", () => {
    const first = setMockReturn(mockInstanceFactory());
    sdk.initViewer(baseConfig);
    (SDKInstance as unknown as jest.Mock).mockReset();
    const returned = sdk.initManager({ ...baseConfig, mode: SDKMode.Viewer });
    expect(returned).toBe(first);
    expect(first.initFrame).toHaveBeenCalledTimes(2);
  });

  test("multiple frameIds tracked independently", () => {
    const inst1 = setMockReturn(mockInstanceFactory());
    sdk.initViewer({ ...baseConfig, frameId: "frame-a" });
    const inst2 = setMockReturn(mockInstanceFactory());
    sdk.initEditor({ ...baseConfig, frameId: "frame-b" });
    expect(Object.keys(sdk.frames).sort()).toEqual(["frame-a", "frame-b"]);
    expect(sdk.frames["frame-a"]).toBe(inst1);
    expect(sdk.frames["frame-b"]).toBe(inst2);
  });
});

describe("SDK init core", () => {
  let sdk: SDK;
  let config: TFrameConfig;
  beforeEach(() => {
    sdk = new SDK();
    config = {
      frameId: "core-frame",
      mode: SDKMode.Viewer,
      src: "https://example.com",
    };
    (SDKInstance as unknown as jest.Mock).mockReset();
  });

  test("creates new instance when frameId absent", () => {
    const inst = setMockReturn(mockInstanceFactory());
    const result = sdk.init(config);
    expect(result).toBe(inst);
    expect(inst.initFrame).toHaveBeenCalledWith(config);
    expect(sdk.frames[config.frameId]).toBe(inst);
  });

  test("reuses existing instance when frameId present", () => {
    const inst = setMockReturn(mockInstanceFactory());
    sdk.init(config);
    (SDKInstance as unknown as jest.Mock).mockReset();
    const result = sdk.init({ ...config, src: "https://changed.example.com" });
    expect(result).toBe(inst);
    expect(inst.initFrame).toHaveBeenCalledTimes(2);
  });
});
