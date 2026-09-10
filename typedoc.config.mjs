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
/** @type {Partial<import("typedoc").TypeDocOptions> & Record<string, any>} */
export default {
  entryPoints: [
    "src/constants/index.ts",
    "src/enums/index.ts",
    "src/errors/index.ts",
    "src/instance/index.ts",
    "src/sdk/index.ts",
    "src/types/index.ts",
  ],
  plugin: [
    "typedoc-plugin-markdown",
    "typedoc-plugin-frontmatter",
    "typedoc-docusaurus-theme",
  ],
  out: "docs",
  entryFileName: "index.md",
  name: "@onlyoffice/docspace-sdk-js",
  includeVersion: true,
  excludeReferences: true,
  excludePrivate: true,
  excludeProtected: true,
  excludeInternal: true,
  excludeExternals: true,
  readme: "none",
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hideGenerator: true,
  categorizeByGroup: false,
  groupOrder: ["Classes", "Type Aliases", "Enumerations", "Variables"],
  sort: ["alphabetical"],
  sortEntryPoints: true,
  kindSortOrder: [
    "Project",
    "Module",
    "Namespace",
    "Class",
    "TypeAlias",
    "Enum",
    "EnumMember",
    "Constructor",
    "Property",
    "Variable",
    "Function",
    "Accessor",
    "Method",
    "Parameter",
    "TypeParameter",
    "TypeLiteral",
    "CallSignature",
    "ConstructorSignature",
    "IndexSignature",
    "GetSignature",
    "SetSignature",
  ],
  validation: {
    notExported: true,
    invalidLink: true,
    rewrittenLink: true,
    notDocumented: false,
    unusedMergeModuleWith: true,
  },
  treatValidationWarningsAsErrors: true,
  disableSources: false,
  sourceLinkTemplate:
    "https://github.com/ONLYOFFICE/docspace-sdk-js/blob/{gitRevision}/{path}#L{line}",
  gitRevision: "master",
  githubPages: false,
  searchInComments: true,
  cleanOutputDir: true,
  commentStyle: "jsdoc",
  useTsLinkResolution: true,
  jsDocCompatibility: {
    defaultTag: true,
    exampleTag: true,
    ignoreUnescapedBraces: true,
  },
  locales: {
    en: {
      tag_deprecated: "Deprecated:",
      tag_remarks: "Remarks:",
    },
  },
  textContentMappings: {
    "title.memberPage": "{name}",
  },
  useCodeBlocks: true,
  expandParameters: true,
  parametersFormat: "table",
  propertiesFormat: "table",
  enumMembersFormat: "table",
  typeDeclarationFormat: "table",
  tableColumnSettings: {
    hideSources: true,
  },
  sidebar: {
    autoConfiguration: true,
    pretty: true,
  },
};
