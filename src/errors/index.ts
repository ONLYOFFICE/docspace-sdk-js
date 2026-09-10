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

/**
 * @module
 * @mergeModuleWith <project>
 */

/**
 * Error codes for {@link SDKError}. Each code identifies a specific failure category
 * in the SDK's iframe communication and lifecycle management.
 *
 * @example
 * ```typescript
 * import { SDKError, SDKErrorCode } from '@onlyoffice/docspace-sdk-js';
 *
 * try {
 *   await instance.getFiles();
 * } catch (err) {
 *   if (err instanceof SDKError && err.code === SDKErrorCode.Timeout) {
 *     console.warn('Request timed out — retry?', err.recoverable);
 *   }
 * }
 * ```
 */
export enum SDKErrorCode {
  /** A method call exceeded its configured timeout ({@link TFrameConfig.methodTimeout}). */
  Timeout = "TIMEOUT",
  /** The iframe is not connected or was disconnected while a call was in flight. */
  Disconnected = "DISCONNECTED",
  /** The host domain is blocked by the ONLYOFFICE Apps Content Security Policy. */
  CSPViolation = "CSP_VIOLATION",
  /** A method was called in an incompatible {@link SDKMode} (e.g. {@link SDKInstance.upload} outside {@link SDKMode.Forms}). */
  ModeMismatch = "MODE_MISMATCH",
  /** The provided {@link TFrameConfig} is missing required fields or has invalid values. */
  InvalidConfig = "INVALID_CONFIG",
  /** A file upload failed or timed out. */
  UploadFailed = "UPLOAD_FAILED",
  /** An incoming postMessage payload could not be parsed as valid JSON. */
  ParseError = "PARSE_ERROR",
  /** The SDK could not resolve an OAuth access token: the {@link TFrameConfig.getToken} callback threw/rejected, or neither `getToken` nor {@link TFrameConfig.accessToken} was provided in OAuth mode. */
  TokenResolveFailed = "TOKEN_RESOLVE_FAILED",
}

/**
 * The SDK's structured error class. Thrown or passed to {@link TFrameEvents.onAppError}
 * whenever the SDK encounters a known failure.
 *
 * The `code` property identifies the failure category; `recoverable` indicates whether
 * the caller may retry the operation without reinitializing the frame.
 *
 * @example
 * ```typescript
 * import { SDKError, SDKErrorCode } from '@onlyoffice/docspace-sdk-js';
 *
 * instance.getFiles().catch((err) => {
 *   if (err instanceof SDKError) {
 *     console.error(`[${err.code}] ${err.message}`);
 *     if (err.recoverable) {
 *       scheduleRetry();
 *     }
 *   }
 * });
 * ```
 */
export class SDKError extends Error {
  /**
   * The error category. One of the {@link SDKErrorCode} string values.
   * Use this for programmatic branching rather than parsing `message`.
   */
  readonly code: SDKErrorCode;

  /**
   * Whether the caller can retry the failed operation without reinitializing the frame.
   * Default: `false`.
   */
  readonly recoverable: boolean;

  /**
   * @param code - The error category. Use a {@link SDKErrorCode} value.
   * @param message - Human-readable description of what went wrong.
   * @param recoverable - Whether the operation may be retried. Default: `false`.
   */
  constructor(code: SDKErrorCode, message: string, recoverable: boolean = false) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "SDKError";
    this.code = code;
    this.recoverable = recoverable;
  }
}
