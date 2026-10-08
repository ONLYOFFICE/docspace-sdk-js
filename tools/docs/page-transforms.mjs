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

/** Docusaurus front matter key that overrides the "Edit this page" link. */
export const EDIT_URL_KEY = "custom_edit_url";

const ANY_HEADING = /^(#{1,6}) /;
const PAGE_TITLE = /^# /;
const CODE_FENCE = /^\s*(```|~~~)/;
const SOURCE_REFERENCE = /^Defined in: \[[^\]]+\]\((https:\/\/github\.com\/[^)]+)\)$/;
const IN_PAGE_LINK = /\]\(#([^)\s]+)\)/g;

/**
 * Index of the first line at or after `start` that is not blank.
 * @param {string[]} lines
 * @param {number} start
 */
function skipBlankLines(lines, start) {
  let index = start;
  while (index < lines.length && lines[index].trim() === "") index++;
  return index;
}

/**
 * Moves the page-level source reference (the `Defined in:` line under the H1) into
 * `custom_edit_url` front matter, so the site's "Edit this page" link opens the source
 * file on GitHub, and drops member-level source references.
 * @param {string} content
 */
function moveSourceLinkToFrontmatter(content) {
  /** @type {string[]} */
  const resultLines = [];

  let isUnderPageTitle = false;
  /** @type {string | undefined} */
  let editUrl;

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

    if (isUnderPageTitle && editUrl === undefined) {
      editUrl = sourceMatch[1];
      isUnderPageTitle = false;
    }

    if (resultLines[resultLines.length - 1]?.trim() === "") resultLines.pop();
  }

  const body = resultLines.join("\n");
  return editUrl === undefined ? body : `---\n${EDIT_URL_KEY}: ${editUrl}\n---\n\n${body}`;
}

/**
 * Puts the page description before the signature block. TypeDoc renders the
 * `type X = …` / `const X: …` block of a type alias or variable right after the H1,
 * and a page whose body opens with code hands the site's llms.txt generator the code
 * instead of a summary. Pages whose description already comes first are left alone.
 * @param {string} content
 */
function moveDescriptionAboveSignature(content) {
  const marked = [...walkMarkdownLines(content)];
  const lines = marked.map(({ line }) => line);

  const titleIndex = marked.findIndex(
    ({ line, insideCodeBlock }) => !insideCodeBlock && PAGE_TITLE.test(line)
  );
  if (titleIndex === -1) return content;

  const signatureStart = skipBlankLines(lines, titleIndex + 1);
  if (!CODE_FENCE.test(lines[signatureStart] ?? "")) return content;

  let signatureEnd = signatureStart + 1;
  while (signatureEnd < lines.length && !CODE_FENCE.test(lines[signatureEnd])) signatureEnd++;
  if (signatureEnd >= lines.length) return content;
  signatureEnd++;

  const descriptionStart = skipBlankLines(lines, signatureEnd);
  let descriptionEnd = descriptionStart;
  while (
    descriptionEnd < lines.length &&
    !ANY_HEADING.test(lines[descriptionEnd]) &&
    !CODE_FENCE.test(lines[descriptionEnd])
  ) {
    descriptionEnd++;
  }
  while (descriptionEnd > descriptionStart && lines[descriptionEnd - 1].trim() === "") {
    descriptionEnd--;
  }
  if (descriptionEnd === descriptionStart) return content;

  const rest = lines.slice(skipBlankLines(lines, descriptionEnd));

  return [
    ...lines.slice(0, titleIndex + 1),
    "",
    ...lines.slice(descriptionStart, descriptionEnd),
    "",
    ...lines.slice(signatureStart, signatureEnd),
    "",
    ...rest,
  ].join("\n");
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
  moveSourceLinkToFrontmatter,
  moveDescriptionAboveSignature,
  escapePipesInTableCells,
  fixInPageAnchors,
  ensureBlankLineBeforeHeadings,
];
