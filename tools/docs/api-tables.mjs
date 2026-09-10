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
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { transformFile, walkMarkdownLines } from "../shared/markdown.mjs";

const APITABLE_IMPORT = "import APITable from '@site/src/components/APITable/APITable';";

const ROW_ANCHOR = /^\| <a id="([^"]+)"><\/a> /;
const HEADING = /^(#{1,6}) (.+)$/;
const FIRST_CELL = /^\| ((?:\\\||[^|])+?) \|/;
const OPTIONAL_FIRST_CELL = /^\| `([^`]+)\?` /;
const LINK_WITH_FRAGMENT = /\]\(([^)#\s]*)#([^)\s]+)\)/g;

const GROUP_HEADINGS = new Set([
  "example",
  "examples",
  "properties",
  "methods",
  "constructors",
  "accessors",
  "parameters",
  "returns",
  "type parameters",
  "type declaration",
  "enumeration members",
  "extends",
  "overrides",
  "inherited from",
  "see",
  "remarks",
  "deprecated",
]);

/**
 * Row id the APITable component derives at runtime: the code span of the first cell, without the optional `?`.
 * @param {string} cellText
 */
function rowNameOf(cellText) {
  const inlineCode = cellText.match(/`([^`]+)`/);
  return inlineCode
    ? inlineCode[1].replace(/\?$/, "")
    : cellText.replace(/[~*_[\]`\\]/g, "").trim();
}

/**
 * @typedef {Object} MemberTable
 * @property {number} start - first line of the table
 * @property {number} end - line after the table's last line
 * @property {string} symbolName - heading the table belongs to
 * @property {{lineNumber: number, oldId: string | null, rowName: string}[]} rows
 */

/**
 * Finds the tables of a page and the symbol each belongs to.
 * @param {string[]} lines
 * @param {boolean[]} insideCode
 * @returns {MemberTable[]}
 */
function findMemberTables(lines, insideCode) {
  /** @type {MemberTable[]} */
  const tables = [];
  let pageTitle = "";
  let symbolName = "";

  for (let index = 0; index < lines.length; index++) {
    if (insideCode[index]) continue;

    const headingMatch = lines[index].match(HEADING);
    if (headingMatch) {
      const [, hashes, title] = headingMatch;
      const isGroupHeading = GROUP_HEADINGS.has(title.trim().toLowerCase());

      if (hashes.length === 1) {
        pageTitle = symbolName = title.trim();
      } else if (!isGroupHeading) {
        symbolName = title.trim();
      } else if (hashes.length === 2) {
        symbolName = pageTitle;
      }
      continue;
    }

    if (!lines[index].startsWith("|")) continue;

    const start = index;
    /** @type {MemberTable["rows"]} */
    const rows = [];

    while (index < lines.length && lines[index].startsWith("|")) {
      const anchorMatch = lines[index].match(ROW_ANCHOR);
      const isBodyRow = index > start + 1;
      if (anchorMatch || isBodyRow) {
        const cellMatch = lines[index].replace(ROW_ANCHOR, "| ").match(FIRST_CELL);
        rows.push({
          lineNumber: index,
          oldId: anchorMatch ? anchorMatch[1] : null,
          rowName: rowNameOf(cellMatch ? cellMatch[1] : ""),
        });
      }
      index++;
    }

    if (rows.length) tables.push({ start, end: index, symbolName, rows });
  }

  return tables;
}

/**
 * Wraps the tables of one page in `<APITable>`, strips `<a id>` row anchors and moves the
 * optional `?` outside the code span. Tables get a `name` prefix when row names collide
 * across the page. Returns the old anchor → new id map.
 * @param {string} filePath
 * @returns {Map<string, string>}
 */
function wrapMemberTables(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const marked = [...walkMarkdownLines(content)];
  const lines = marked.map(({ line }) => line);
  const insideCode = marked.map(({ insideCodeBlock }) => insideCodeBlock);

  const tables = findMemberTables(lines, insideCode);
  /** @type {Map<string, string>} */
  const anchorMap = new Map();
  if (!tables.length) return anchorMap;

  const allRowNames = tables.flatMap(({ rows }) => rows.map((row) => row.rowName));
  const usePrefix = new Set(allRowNames).size !== allRowNames.length;
  const seenIds = new Set();

  for (const table of tables) {
    const prefix = usePrefix ? `${table.symbolName.replace(/[^\w.-]/g, "")}-` : "";

    for (const row of table.rows) {
      const newId = prefix + row.rowName;
      if (seenIds.has(newId)) {
        console.warn(`[warn] Duplicate APITable row id "${newId}" in ${basename(filePath)}`);
      }
      if (row.rowName.includes(".")) {
        console.warn(
          `[warn] Nested member "${row.rowName}" in ${basename(filePath)} — extract a named type`
        );
      }
      seenIds.add(newId);
      if (row.oldId) anchorMap.set(row.oldId, newId);
      lines[row.lineNumber] = lines[row.lineNumber]
        .replace(ROW_ANCHOR, "| ")
        .replace(OPTIONAL_FIRST_CELL, "| `$1`? ");
    }
  }

  for (let i = tables.length - 1; i >= 0; i--) {
    const { start, end } = tables[i];
    const nameAttribute = usePrefix
      ? ` name="${tables[i].symbolName.replace(/[^\w.-]/g, "")}"`
      : "";
    const opener = [
      "```mdx-code-block",
      ...(i === 0 ? [APITABLE_IMPORT, ""] : []),
      `<APITable${nameAttribute}>`,
      "```",
      "",
    ];
    const closer = ["", "```mdx-code-block", "</APITable>", "```"];
    lines.splice(end, 0, ...closer);
    lines.splice(start, 0, ...opener);
  }

  transformFile(filePath, () => lines.join("\n"));
  return anchorMap;
}

/**
 * Wraps the tables of every page and rewrites in-page and cross-page fragment links
 * from TypeDoc's `<a id>` anchors to the APITable row ids.
 * @param {string[]} filePaths
 */
export function applyApiTables(filePaths) {
  /** @type {Map<string, Map<string, string>>} */
  const anchorMapsByPage = new Map();

  for (const filePath of filePaths) {
    anchorMapsByPage.set(resolve(filePath), wrapMemberTables(filePath));
  }

  for (const filePath of filePaths) {
    transformFile(filePath, (content) =>
      content.replace(LINK_WITH_FRAGMENT, (wholeLink, relativePath, fragment) => {
        const targetPath = relativePath
          ? resolve(dirname(filePath), relativePath)
          : resolve(filePath);
        const newId = anchorMapsByPage.get(targetPath)?.get(fragment);
        return newId ? `](${relativePath}#${newId})` : wholeLink;
      })
    );
  }
}
