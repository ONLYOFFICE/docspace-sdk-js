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
import { basename } from "node:path";
import { collectPageAnchors, walkMarkdownLines } from "../shared/markdown.mjs";

export const SOURCE_LINK_LABEL = "View source on GitHub";

const ANY_HEADING = /^(#{1,6}) /;
const SOURCE_REFERENCE = /^Defined in: \[[^\]]+\]\((https:\/\/github\.com\/[^)]+)\)$/;
const IN_PAGE_LINK = /\]\(#([^)\s]+)\)/g;

/**
 * Keeps one "View source on GitHub" link per page (the one under the H1) and drops member-level ones.
 * @param {string} content
 */
function convertSourceLinks(content) {
  /** @type {string[]} */
  const resultLines = [];

  let isUnderPageTitle = false;

  for (const { line, insideCodeBlock } of walkMarkdownLines(content)) {
    if (insideCodeBlock) {
      resultLines.push(line);
      continue;
    }

    const headingMatch = line.match(ANY_HEADING);
    if (headingMatch) {
      isUnderPageTitle = headingMatch[1].length === 1;
      resultLines.push(line);
      continue;
    }

    const sourceMatch = line.match(SOURCE_REFERENCE);
    if (!sourceMatch) {
      resultLines.push(line);
      continue;
    }

    if (isUnderPageTitle) {
      resultLines.push(`[${SOURCE_LINK_LABEL}](${sourceMatch[1]})`);
      isUnderPageTitle = false;
      continue;
    }

    if (resultLines[resultLines.length - 1]?.trim() === "") resultLines.pop();
  }

  return resultLines.join("\n");
}

/**
 * Escapes `|` inside inline code in table cells.
 * @param {string} content
 */
function escapePipesInTableCells(content) {
  return [...walkMarkdownLines(content)]
    .map(({ line, insideCodeBlock }) => {
      if (insideCodeBlock || !line.startsWith("|")) return line;

      return line.replace(/`[^`]*`/g, (inlineCode) =>
        inlineCode.replace(/(?<!\\)\|/g, "\\|")
      );
    })
    .join("\n");
}

/**
 * Drops stale `-N` suffixes from in-page hash links and warns about anchors that resolve to nothing.
 * @param {string} content
 * @param {string} filePath
 */
function fixInPageAnchors(content, filePath) {
  const anchors = collectPageAnchors(content);

  return content.replace(IN_PAGE_LINK, (wholeLink, anchor) => {
    const normalizedAnchor = anchor.toLowerCase();
    if (anchors.has(normalizedAnchor)) return wholeLink;

    const withoutSuffix = normalizedAnchor.replace(/-\d+$/, "");
    if (withoutSuffix !== normalizedAnchor && anchors.has(withoutSuffix)) {
      return `](#${withoutSuffix})`;
    }

    console.warn(`[warn] Unresolved in-page anchor #${anchor} in ${basename(filePath)}`);
    return wholeLink;
  });
}

/**
 * Inserts the blank line MDX requires before a heading.
 * @param {string} content
 */
function ensureBlankLineBeforeHeadings(content) {
  /** @type {string[]} */
  const resultLines = [];

  for (const { line, insideCodeBlock } of walkMarkdownLines(content)) {
    const isHeading = !insideCodeBlock && ANY_HEADING.test(line);
    const previousLine = resultLines[resultLines.length - 1];

    if (isHeading && previousLine !== undefined && previousLine.trim() !== "") {
      resultLines.push("");
    }

    resultLines.push(line);
  }

  return resultLines.join("\n");
}

/** Per-page transforms, in run order. */
export const PAGE_TRANSFORMS = [
  convertSourceLinks,
  escapePipesInTableCells,
  fixInPageAnchors,
  ensureBlankLineBeforeHeadings,
];
