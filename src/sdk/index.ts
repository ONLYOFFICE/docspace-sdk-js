/**
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
 *
 * @license
 */

/**
 * @module
 * @mergeModuleWith <project>
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
 */
export class SDK {
  /**
   * Array containing instances of SDKInstance.
   * Each instance represents a separate SDK configuration.
   */
  instances: SDKInstance[] = [];
  /**
   * Maps frame IDs to their corresponding SDKInstance objects.
   * Used to track and manage multiple SDK instances across different frames.
   */
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

  /**
   * Initializes the frame with the given configuration.
   *
   * @param config - The configuration object for the frame.
   * @returns The initialized SDK instance.
   */
  initFrame = (config: TFrameConfig) => this.init(config);

  /**
   * Initializes the manager with the provided configuration.
   *
   * @param config - The configuration object for initializing the manager.
   * @returns The initialized SDK instance.
   */
  initManager = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Manager });

  /**
   * Initializes the viewer with the provided configuration.
   *
   * @param config - The configuration object for the viewer.
   * @returns The initialized SDK instance.
   */
  initViewer = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Viewer });

  /**
   * Initializes the editor with the given configuration.
   *
   * @param config - The configuration object for the editor.
   * @returns The initialized SDK instance.
   */
  initEditor = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.Editor });

  /**
   * Initializes the Room Selector with the provided configuration.
   *
   * @param config - The configuration object for initializing the Room Selector.
   * @returns The initialized SDK instance.
   */
  initRoomSelector = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.RoomSelector });

  /**
   * Initializes the file selector with the given configuration.
   *
   * @param config - The configuration object for the file selector.
   * @returns The initialized SDK instance.
   */
  initFileSelector = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.FileSelector });

  /**
   * Initializes the system with the provided configuration.
   *
   * @param config - The configuration object for initializing the system.
   * @returns The initialized SDK instance.
   */
  initSystem = (config: TFrameConfig) =>
    this.init({ ...config, mode: SDKMode.System });
}
