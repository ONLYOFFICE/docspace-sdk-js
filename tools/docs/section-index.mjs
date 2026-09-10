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
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { walkMarkdownLines } from "../shared/markdown.mjs";
import { SOURCE_LINK_LABEL } from "./page-transforms.mjs";

/**
 * True for a source reference line, raw ("Defined in:") or rewritten.
 * @param {string} line
 */
function isSourceReferenceLine(line) {
  return line.startsWith("Defined in:") || line.startsWith(`[${SOURCE_LINK_LABEL}](`);
}

/**
 * First sentence of a text. Does not break on periods inside parentheses,
 * after common abbreviations ("etc.", "e.g.") or inside tokens ("9.2").
 * @param {string} text
 */
function firstSentence(text) {
  if (!text) return "";

  const endsWithAbbreviation = /(?:\betc|\be\.g|\bi\.e|\bvs)\.$/i;
  let parenthesesDepth = 0;

  for (let position = 0; position < text.length; position++) {
    const character = text[position];

    if (character === "(") parenthesesDepth++;
    else if (character === ")") {
      parenthesesDepth = Math.max(0, parenthesesDepth - 1);
    } else if (
      (character === "." || character === "!" || character === "?") &&
      parenthesesDepth === 0
    ) {
      const nextCharacter = text[position + 1];
      if (nextCharacter !== undefined && nextCharacter !== " ") continue;
      if (character === "." && endsWithAbbreviation.test(text.slice(0, position + 1))) {
        continue;
      }
      return text.slice(0, position + 1);
    }
  }

  return text;
}

/**
 * H1 title of a generated page (falls back to the given name).
 * @param {string} pagePath
 * @param {string} fallback
 */
function readPageTitle(pagePath, fallback) {
  const content = readFileSync(pagePath, "utf-8");
  const titleMatch = content.match(/^# (.+)$/m);
  return titleMatch ? titleMatch[1].trim().replace(/\\_/g, "_") : fallback;
}

/**
 * Description of the page's symbol: the first paragraph after the H1, skipping
 * the signature code block and the source link.
 * @param {string} pagePath
 */
function readPageDescription(pagePath) {
  const content = readFileSync(pagePath, "utf-8");
  const body = content.replace(/^---\n[\s\S]*?---\n/, "");

  let passedTitleOrSourceLink = false;
  const descriptionLines = [];

  for (const { line, insideCodeBlock } of walkMarkdownLines(body)) {
    if (insideCodeBlock) continue;

    const trimmed = line.trim();

    if (/^# /.test(line) || isSourceReferenceLine(trimmed)) {
      if (descriptionLines.length > 0) break;
      passedTitleOrSourceLink = true;
      continue;
    }

    if (/^#{2,} /.test(line)) break;

    if (!trimmed) {
      if (descriptionLines.length > 0) break;
      continue;
    }

    if (trimmed.startsWith("![") || trimmed.startsWith(">")) continue;
    if (!passedTitleOrSourceLink) continue;

    descriptionLines.push(trimmed);
  }

  return firstSentence(descriptionLines.join(" ").trim());
}

/**
 * Generates index.md for one section: title, prose from sections.mjs, and an
 * overview table built from the final page titles and descriptions.
 * @param {import("./sections.mjs").Section} section
 * @param {string} docsDir
 */
export function generateIndexPage(section, docsDir) {
  const sectionPath = join(docsDir, section.docsDir);

  if (!existsSync(sectionPath)) {
    console.warn(`[warn] Skipping "${section.title}" — docs directory not found`);
    return;
  }

  const pageFiles = readdirSync(sectionPath)
    .filter((fileName) => fileName.endsWith(".md") && fileName !== "index.md")
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const tableRows = [];
  for (const fileName of pageFiles) {
    const pagePath = join(sectionPath, fileName);
    const displayName = readPageTitle(pagePath, basename(fileName, ".md"));
    const description = readPageDescription(pagePath) || "—";

    tableRows.push(`| [\`${displayName}\`](${fileName}) | ${description} |`);
  }

  if (!tableRows.length) {
    console.warn(`[warn] No docs found for "${section.title}" — skipping`);
    return;
  }

  const content = [
    `# ${section.title}`,
    ``,
    section.description,
    ``,
    `## Overview`,
    ``,
    section.tableCaption,
    ``,
    `| ${section.tableHeaderName} | Description |`,
    `| --- | --- |`,
    ...tableRows,
    ``,
  ].join("\n");

  writeFileSync(join(sectionPath, "index.md"), content, "utf-8");
  console.log(`Generated docs/${section.docsDir}/index.md (${tableRows.length} entries)`);
}
