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
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { transformFile } from "../shared/markdown.mjs";
import { PAGE_TRANSFORMS } from "./page-transforms.mjs";
import { applyApiTables } from "./api-tables.mjs";
import { generateIndexPage } from "./section-index.mjs";
import { SECTIONS } from "./sections.mjs";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
const DOCS_DIR = join(ROOT, "docs");

/**
 * Symbol pages under a directory, excluding index pages.
 * @param {string} dir
 * @returns {string[]}
 */
function findGeneratedPages(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) return findGeneratedPages(entryPath);
    return entry.name.endsWith(".md") && entry.name !== "index.md" ? [entryPath] : [];
  });
}

const generatedPages = findGeneratedPages(DOCS_DIR);

for (const pagePath of generatedPages) {
  for (const transform of PAGE_TRANSFORMS) {
    transformFile(pagePath, transform);
  }
}

applyApiTables(generatedPages);

for (const section of SECTIONS) {
  generateIndexPage(section, DOCS_DIR);
}

console.log(`Post-processed ${generatedPages.length} pages.`);
