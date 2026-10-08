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
 * Checks the external links of the given Markdown files: `node tools/check-links.mjs README.md CONTRIBUTING.md`.
 */
import { readFileSync } from "node:fs";

const SKIP_HOSTS = ["portal.example.com", "example.com", "localhost", "127.0.0.1"];
const URL_PATTERN = /https?:\/\/[^\s<>()"'`\]]+/g;
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node tools/check-links.mjs <file.md> [more files]");
  process.exit(2);
}

/** @type {Map<string, Set<string>>} */
const links = new Map();

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  for (const match of content.matchAll(URL_PATTERN)) {
    const url = match[0].replace(/[.,;:!?]+$/, "").replace(/#.*$/, "");
    const { hostname } = new URL(url);
    if (SKIP_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) continue;
    if (!links.has(url)) links.set(url, new Set());
    links.get(url)?.add(file);
  }
}

/**
 * @param {string} url
 * @param {"HEAD" | "GET"} method
 * @returns {Promise<number>}
 */
async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "docspace-sdk-js link check (+https://github.com/ONLYOFFICE/docspace-sdk-js)" },
    });
    return response.status;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} url
 * @returns {Promise<{ url: string, status: number | string }>}
 */
async function check(url) {
  try {
    let status = await request(url, "HEAD");
    if (status === 405 || status === 403 || status === 404 || status === 400) status = await request(url, "GET");
    return { url, status };
  } catch (error) {
    return { url, status: error instanceof Error ? error.message : String(error) };
  }
}

const queue = [...links.keys()];
/** @type {{ url: string, status: number | string }[]} */
const results = [];

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      results.push(await check(url));
    }
  }),
);

const failures = results.filter(({ status }) => typeof status !== "number" || status >= 400);

for (const { url, status } of results.sort((a, b) => a.url.localeCompare(b.url))) {
  const mark = typeof status === "number" && status < 400 ? "ok  " : "FAIL";
  console.log(`${mark} ${status} ${url}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${results.length} link(s) failed:`);
  for (const { url, status } of failures) {
    console.error(`  ${status} ${url} (in ${[...(links.get(url) ?? [])].join(", ")})`);
  }
  process.exit(1);
}

console.log(`\nAll ${results.length} links are reachable.`);
