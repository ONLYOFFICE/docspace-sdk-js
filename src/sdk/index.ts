import { TFrameConfig } from "../types";
import SDKInstance from "../instance";

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
export default class SDK {
  instances: SDKInstance[] = [];

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
}
