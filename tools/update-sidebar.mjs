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

// @ts-check
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PATH_PREFIX = "docspace/javascript-sdk/usage-sdk";
const SIDEBAR_FILE = join(process.cwd(), "docs", "typedoc-sidebar.cjs");
const CONFIG_FILE = join(process.cwd(), "typedoc.json");
const DEFAULT_BRANCH = "master";

try {
  let content = readFileSync(SIDEBAR_FILE, "utf-8");

  content = content.replace(
    /id:\s*"([^"]+)"/g,
    (_, id) => `id: "${PATH_PREFIX}/${id}"`
  );

  writeFileSync(SIDEBAR_FILE, content, "utf-8");

  console.log(`Updated sidebar with path prefix: ${PATH_PREFIX}`);

  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));

  config.gitRevision = DEFAULT_BRANCH;

  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf-8");

  console.log(`Reverted revision to: ${DEFAULT_BRANCH}`);
} catch (error) {
  console.error("Error updating sidebar:", error);
  process.exit(1);
}
