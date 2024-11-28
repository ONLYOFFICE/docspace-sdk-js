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

import { TFrameConfig } from "../types";
import { SDKMode } from "../enums";
import { SDKInstance } from "../instance";

/**
 * The SDK class is responsible for managing multiple SDKInstance objects.
 * It provides a method to initialize instances with a given configuration.
 *
 * @remarks
 * - If an instance with the same frameId already exists, it reinitializes that instance.
 * - Otherwise, it creates a new instance, initializes it, and adds it to the instances list.
 *
 * @example
 * ```typescript
 * const sdk = new SDK();
 * const config = { frameId: 'frame1', ...otherConfig };
 * const instance = sdk.init(config);
 * ```
 *
 * @public
 */
export class SDK {
  instances: SDKInstance[] = [];
  frames: Record<string, SDKInstance> = {};

  /**
   * Initializes an SDK instance with the provided configuration.
   * If an instance with the same frameId already exists, it reinitializes that instance.
   * Otherwise, it creates a new instance, initializes it, and adds it to the instances list.
   *
   * @param config - The configuration object for the SDK instance.
   * @returns The initialized SDK instance.
   */
  init = (config: TFrameConfig): SDKInstance => {
    const existInstance = this.instances.find(
      (i) => i.config.frameId === config.frameId
    );

    if (existInstance) {
      existInstance.initFrame(config);
      return existInstance;
    }

    const instance = new SDKInstance(config);

    instance.initFrame(config);

    this.instances.push(instance);

    return instance;
  };

  initFrame = (config: TFrameConfig) => this.init(config);

  initManager = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Manager });

  initViewer = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Viewer });

  initEditor = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Editor });

  initRoomSelector = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.RoomSelector });

  initFileSelector = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.FileSelector });

  initSystem = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.System });
}
