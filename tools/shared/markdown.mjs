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
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CODE_BLOCK_MARKER = /^\s*(```|~~~)/;
const EXPLICIT_ANCHOR = /<a id="([^"]+)"><\/a>/g;
const SECONDARY_HEADING = /^#{2,6} (.+)$/;

/**
 * Yields every line with its number and whether it is inside a fenced code block.
 * @param {string} content
 * @returns {Generator<{line: string, lineNumber: number, insideCodeBlock: boolean}>}
 */
export function* walkMarkdownLines(content) {
  const lines = content.split("\n");

  let openedCodeBlock = false;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber];
    const isCodeBlockMarker = CODE_BLOCK_MARKER.test(line);

    if (isCodeBlockMarker) openedCodeBlock = !openedCodeBlock;

    yield {
      line,
      lineNumber,
      insideCodeBlock: openedCodeBlock || isCodeBlockMarker,
    };
  }
}

/**
 * Applies a content transform to a file, writing back only on change.
 * @param {string} filePath
 * @param {(content: string, filePath: string) => string} transform
 */
export function transformFile(filePath, transform) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf-8");
  const updated = transform(content, filePath);

  if (updated !== content) writeFileSync(filePath, updated, "utf-8");
}

/**
 * Heading slug the way Docusaurus (github-slugger) builds it.
 * @param {string} text
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[`*\\]/g, "")
    .replace(/[^\w\- ]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Anchors a page offers: H2–H6 slugs (deduplicated with `-N` suffixes) and `<a id>` row anchors.
 * @param {string} content
 * @returns {Set<string>}
 */
export function collectPageAnchors(content) {
  /** @type {Map<string, number>} */
  const usedSlugCounts = new Map();
  const anchors = new Set();

  for (const { line, insideCodeBlock } of walkMarkdownLines(content)) {
    if (insideCodeBlock) continue;

    for (const [, anchorId] of line.matchAll(EXPLICIT_ANCHOR)) {
      anchors.add(anchorId.toLowerCase());
    }

    const headingMatch = line.match(SECONDARY_HEADING);
    if (!headingMatch) continue;

    const slug = slugify(headingMatch[1]);
    if (!slug) continue;

    const timesSeen = usedSlugCounts.get(slug) ?? 0;
    usedSlugCounts.set(slug, timesSeen + 1);
    anchors.add(timesSeen === 0 ? slug : `${slug}-${timesSeen}`);
  }

  return anchors;
}
