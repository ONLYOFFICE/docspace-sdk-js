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
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = join(rootDir, "docs");
const TARGET_REPO = join(rootDir, "..", "api.onlyoffice.com");
const TARGET = join(TARGET_REPO, "site", "docspace", "javascript-sdk", "usage-sdk");

if (!existsSync(join(SOURCE, "typedoc-sidebar.cjs"))) {
  console.error("docs/ is missing or incomplete — run `pnpm run docs` first");
  process.exit(1);
}

if (!existsSync(join(TARGET_REPO, ".git"))) {
  console.error(`Target repository not found: ${TARGET_REPO}`);
  process.exit(1);
}

rmSync(TARGET, { recursive: true, force: true });
cpSync(SOURCE, TARGET, { recursive: true });
rmSync(join(TARGET, "index.md"), { force: true });

console.log(`Docs synced to ${TARGET}`);
