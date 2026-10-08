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
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = join(rootDir, "typedoc.config.mjs");
const GIT_REVISION = /gitRevision:\s*["'][^"']*["']/;
const DEFAULT_BRANCH = "master";

/**
 * Output of a git command, or `null` when it fails (no tag on HEAD, not a repository, ...).
 * @param {string} command
 */
function gitOutput(command) {
  try {
    return execSync(command, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Revision the `custom_edit_url` of every page points at: the tag checked out exactly
 * (a release build from `v*`), else the current branch, else `master` when HEAD is
 * detached without a tag (`git rev-parse --abbrev-ref HEAD` prints the literal `HEAD` there).
 */
function resolveRevision() {
  const tag = gitOutput("git describe --tags --exact-match");
  if (tag) return tag;

  const branch = gitOutput("git rev-parse --abbrev-ref HEAD");
  if (branch && branch !== "HEAD") return branch;

  return DEFAULT_BRANCH;
}

try {
  const revision = resolveRevision();

  const config = readFileSync(CONFIG_FILE, "utf-8");
  const current = config.match(GIT_REVISION)?.[0];

  if (!current) throw new Error("gitRevision not found in typedoc.config.mjs");

  if (current === `gitRevision: "${revision}"`) {
    console.log(`Revision already set to: ${revision}`);
    process.exit(0);
  }

  writeFileSync(CONFIG_FILE, config.replace(GIT_REVISION, `gitRevision: "${revision}"`), "utf-8");

  console.log(`Updated revision to: ${revision}`);
} catch (error) {
  console.error("Error updating revision:", error);
  process.exit(1);
}
