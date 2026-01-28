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

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const CONFIG_FILE = join(rootDir, "typedoc.json");

try {
  const gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf-8",
  }).trim();

  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));

  if (config.gitRevision === gitBranch) {
    console.log(`Revision already set to: ${gitBranch}`);
    process.exit(0);
  }

  config.gitRevision = gitBranch;

  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf-8");

  console.log(`Updated revision to: ${gitBranch}`);
} catch (error) {
  console.error("Error updating revision:", error);
  process.exit(1);
}
