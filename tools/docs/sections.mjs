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

// @ts-check

/**
 * Section configuration for the index pages and the sidebar categories.
 *
 * @typedef {Object} Section
 * @property {string} docsDir - Directory inside docs/ (TypeDoc's kind directory)
 * @property {string} sidebarLabel - Label of the sidebar category TypeDoc generates for this kind
 * @property {string} title - Section title (H1 of the index page)
 * @property {string} description - Intro paragraph of the index page
 * @property {string} tableCaption - Line rendered right before the overview table
 * @property {string} tableHeaderName - First column header of the overview table
 */

/** @type {Section[]} */
export const SECTIONS = [
  {
    docsDir: "classes",
    sidebarLabel: "Classes",
    title: "Classes",
    description:
      "The classes an integration works with. `SDK` creates frames and keeps them in a registry, " +
      "`SDKInstance` drives one embedded iframe and exposes the methods that call into it, " +
      "and `SDKError` is what a failed call rejects with.",
    tableCaption: "The following classes are available:",
    tableHeaderName: "Class",
  },
  {
    docsDir: "type-aliases",
    sidebarLabel: "Type Aliases",
    title: "Type Aliases",
    description:
      "Configuration, event, filter and data shapes exchanged with the embedded frame. " +
      "Most integrations only need `TFrameConfig` and `TFrameEvents`; the remaining types describe " +
      "what the instance methods accept and return.",
    tableCaption: "The following types are available:",
    tableHeaderName: "Type",
  },
  {
    docsDir: "enumerations",
    sidebarLabel: "Enumerations",
    title: "Enumerations",
    description:
      "Typed constants for frame modes, themes, editor layouts, sort options and error codes. " +
      "Use them in place of the raw string values they stand for.",
    tableCaption: "The following enumerations are available:",
    tableHeaderName: "Enum",
  },
  {
    docsDir: "variables",
    sidebarLabel: "Variables",
    title: "Variables",
    description:
      "Exported constants: the default frame configuration, the iframe name prefix, " +
      "the CSP validation endpoint and the error messages the SDK shows.",
    tableCaption: "The following constants are available:",
    tableHeaderName: "Constant",
  },
];
