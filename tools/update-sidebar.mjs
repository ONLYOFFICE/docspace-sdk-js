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
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SECTIONS } from "./docs/sections.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIDEBAR_FILE = join(rootDir, "docs", "typedoc-sidebar.cjs");
const CONFIG_FILE = join(rootDir, "typedoc.config.mjs");

const PATH_PREFIX = "docspace/javascript-sdk/usage-sdk";
const DEFAULT_BRANCH = "master";

/**
 * Prefixes doc ids with the site path and points each kind category at its
 * generated index page.
 * @param {any[]} items
 * @returns {any[]}
 */
function rewriteSidebar(items) {
  return items.map((item) => {
    if (item.type === "doc") {
      return { ...item, id: `${PATH_PREFIX}/${item.id}` };
    }

    if (item.type !== "category") return item;

    const section = SECTIONS.find(({ sidebarLabel }) => sidebarLabel === item.label);
    const link = section
      ? { type: "doc", id: `${PATH_PREFIX}/${section.docsDir}/index` }
      : item.link;

    return {
      ...item,
      ...(section ? { label: section.title } : {}),
      ...(link ? { link } : {}),
      items: rewriteSidebar(item.items ?? []),
    };
  });
}

try {
  const require = createRequire(import.meta.url);
  const sidebarItems = rewriteSidebar(require(SIDEBAR_FILE));

  const sidebar = [
    "// @ts-check",
    '/** @type {import("@docusaurus/plugin-content-docs").SidebarsConfig} */',
    `const typedocSidebar = { items: ${JSON.stringify(sidebarItems, null, 2)} };`,
    "module.exports = typedocSidebar.items;",
    "",
  ].join("\n");

  writeFileSync(SIDEBAR_FILE, sidebar, "utf-8");
  console.log(`Updated sidebar with path prefix: ${PATH_PREFIX}`);

  const config = readFileSync(CONFIG_FILE, "utf-8");
  writeFileSync(
    CONFIG_FILE,
    config.replace(/gitRevision:\s*["'][^"']*["']/, `gitRevision: "${DEFAULT_BRANCH}"`),
    "utf-8"
  );
  console.log(`Reverted revision to: ${DEFAULT_BRANCH}`);
} catch (error) {
  console.error("Error updating sidebar:", error);
  process.exit(1);
}
