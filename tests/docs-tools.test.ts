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

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectPageAnchors, slugify, walkMarkdownLines } from "../tools/shared/markdown.mjs";
import { PAGE_TRANSFORMS } from "../tools/docs/page-transforms.mjs";
import { applyApiTables } from "../tools/docs/api-tables.mjs";
import { generateIndexPage } from "../tools/docs/section-index.mjs";

type Transform = (content: string, filePath: string) => string;

const runPageTransforms = (content: string, filePath = "page.md") =>
  (PAGE_TRANSFORMS as Transform[]).reduce((acc, transform) => transform(acc, filePath), content);

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "sdk-docs-tools-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const writePage = (relativePath: string, content: string) => {
  const filePath = join(tempDir, relativePath);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  return filePath;
};

describe("shared/markdown", () => {
  it("flags fenced code blocks including the marker lines", () => {
    const lines = [...walkMarkdownLines("a\n```ts\nb\n```\nc")];
    expect(lines.map((l) => l.insideCodeBlock)).toEqual([false, true, true, true, false]);
  });

  it("slugifies headings the way Docusaurus does", () => {
    expect(slugify("setConfig()")).toBe("setconfig");
    expect(slugify("`FRAME_NAME`")).toBe("frame_name");
    expect(slugify("Type Declaration")).toBe("type-declaration");
  });

  it("collects heading slugs and row anchors, deduplicating repeats", () => {
    const anchors = collectPageAnchors(
      "# Title\n## Example\n## Example\n| <a id=\"onAppReady\"></a> `x` |\n```\n## Not a heading\n```"
    );
    expect([...anchors].sort()).toEqual(["example", "example-1", "onappready"]);
  });
});

describe("page transforms", () => {
  it("keeps one source link under the page title and drops member-level ones", () => {
    const input = [
      "# SDKInstance",
      "",
      "Defined in: [instance/index.ts:90](https://github.com/o/r/blob/master/src/instance/index.ts#L90)",
      "",
      "Intro.",
      "",
      "### login()",
      "",
      "Defined in: [instance/index.ts:500](https://github.com/o/r/blob/master/src/instance/index.ts#L500)",
      "",
      "Logs in.",
    ].join("\n");

    const output = runPageTransforms(input);

    expect(output).toContain(
      "[View source on GitHub](https://github.com/o/r/blob/master/src/instance/index.ts#L90)"
    );
    expect(output).not.toContain("Defined in:");
    expect(output).not.toContain("#L500");
    expect(output).toContain("### login()\n\nLogs in.");
  });

  it("escapes pipes inside inline code in table cells but not in code fences", () => {
    const input = "| `a` | `\"x\" | \"y\"` | text |\n```ts\ntype T = \"x\" | \"y\";\n```";
    const output = runPageTransforms(input);
    expect(output).toContain("| `a` | `\"x\" \\| \"y\"` | text |");
    expect(output).toContain("type T = \"x\" | \"y\";");
  });

  it("drops stale -N suffixes from in-page anchors and warns on dead ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const output = runPageTransforms("# T\n## setConfig()\n\n[a](#setconfig-1) [b](#missing)");
    expect(output).toContain("[a](#setconfig)");
    expect(output).toContain("[b](#missing)");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("#missing"));
    warn.mockRestore();
  });

  it("inserts the blank line MDX needs before a heading", () => {
    expect(runPageTransforms("text\n## Heading")).toBe("text\n\n## Heading");
  });
});

describe("api-tables", () => {
  const table = (rows: string[]) =>
    ["| Property | Type | Description |", "| ------ | ------ | ------ |", ...rows].join("\n");

  it("wraps member tables in APITable, strips row anchors and rewrites links", () => {
    const events = writePage(
      "type-aliases/TFrameEvents.md",
      [
        "# TFrameEvents",
        "",
        "## Properties",
        "",
        table([
          "| <a id=\"onappready\"></a> `onAppReady?` | `null` | Ready. |",
          "| <a id=\"onapperror\"></a> `onAppError?` | `null` | See [onAppReady](#onappready). |",
        ]),
        "",
      ].join("\n")
    );
    const config = writePage(
      "type-aliases/TFrameConfig.md",
      "# TFrameConfig\n\nSee [TFrameEvents.onAppReady](TFrameEvents.md#onappready) and [x](#nope).\n"
    );

    applyApiTables([events, config]);

    const eventsOutput = readFileSync(events, "utf-8");
    expect(eventsOutput).toContain(
      "```mdx-code-block\nimport APITable from '@site/src/components/APITable/APITable';\n\n<APITable>\n```"
    );
    expect(eventsOutput).toContain("```mdx-code-block\n</APITable>\n```");
    expect(eventsOutput).not.toContain("<a id=");
    expect(eventsOutput).toContain("| `onAppReady`? | `null` | Ready. |");
    expect(eventsOutput).toContain("[onAppReady](#onAppReady)");

    const configOutput = readFileSync(config, "utf-8");
    expect(configOutput).toContain("(TFrameEvents.md#onAppReady)");
    expect(configOutput).toContain("[x](#nope)");
  });

  it("wraps parameter tables too, prefixing ids by method when parameter names repeat", () => {
    const page = writePage(
      "classes/SDK.md",
      [
        "# SDK",
        "",
        "### init()",
        "",
        "#### Parameters",
        "",
        "| Parameter | Type |",
        "| ------ | ------ |",
        "| `config` | `T` |",
        "",
        "### initFrame()",
        "",
        "#### Parameters",
        "",
        "| Parameter | Type |",
        "| ------ | ------ |",
        "| `config` | `T` |",
        "| `reload?` | `boolean` |",
        "",
      ].join("\n")
    );
    applyApiTables([page]);
    const output = readFileSync(page, "utf-8");
    expect(output).toContain('<APITable name="init">');
    expect(output).toContain('<APITable name="initFrame">');
    expect(output).toContain("| `reload`? | `boolean` |");
    expect(output.match(/<APITable/g)).toHaveLength(2);
  });

  it("warns about dotted row names left by inlined nested objects", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const page = writePage(
      "type-aliases/Nested.md",
      "# Nested\n\n## Properties\n\n" +
        table([
          "| <a id=\"menu\"></a> `menu?` | `object` | Group. |",
          "| `menu.file?` | `string`[] | Files. |",
        ]) +
        "\n"
    );
    applyApiTables([page]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nested member "menu.file"'));
    warn.mockRestore();
  });

  it("wraps a lone parameter table without a name prefix", () => {
    const page = writePage(
      "classes/One.md",
      "# One\n\n#### Parameters\n\n| Parameter | Type |\n| ------ | ------ |\n| `config` | `T` |\n"
    );
    applyApiTables([page]);
    expect(readFileSync(page, "utf-8")).toContain("<APITable>\n```");
  });

  it("prefixes row ids with the symbol name when two tables share a row name", () => {
    const page = writePage(
      "type-aliases/Both.md",
      [
        "# Both",
        "",
        "## A",
        "",
        table(["| <a id=\"id\"></a> `id` | `number` | A id. |"]),
        "",
        "## B",
        "",
        table(["| <a id=\"id-1\"></a> `id` | `number` | B id, see [A.id](#id). |"]),
        "",
      ].join("\n")
    );

    applyApiTables([page]);

    const output = readFileSync(page, "utf-8");
    expect(output).toContain("<APITable name=\"A\">");
    expect(output).toContain("<APITable name=\"B\">");
    expect(output).toContain("[A.id](#A-id)");
  });
});

describe("section-index", () => {
  it("builds an overview table from page titles and first sentences", () => {
    writePage(
      "variables/FRAME_NAME.md",
      [
        "# FRAME\\_NAME",
        "",
        "```ts",
        "const FRAME_NAME: \"frameDocSpace\";",
        "```",
        "",
        "[View source on GitHub](https://github.com/o/r)",
        "",
        "The prefix for the iframe `name` attribute. The full name is `{FRAME_NAME}__#{frameId}`.",
        "",
      ].join("\n")
    );
    writePage(
      "variables/CSPApiUrl.md",
      "# CSPApiUrl\n\n[View source on GitHub](https://github.com/o/r)\n\nThe CSP endpoint (e.g. for checks). Second sentence.\n"
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    generateIndexPage(
      {
        docsDir: "variables",
        sidebarLabel: "Variables",
        title: "Variables",
        description: "Exported constants.",
        tableCaption: "The following constants are available:",
        tableHeaderName: "Constant",
      },
      tempDir
    );

    log.mockRestore();
    const index = readFileSync(join(tempDir, "variables", "index.md"), "utf-8");
    expect(index).toContain("# Variables\n\nExported constants.\n\n## Overview");
    expect(index).toContain("| Constant | Description |");
    expect(index).toContain(
      "| [`CSPApiUrl`](CSPApiUrl.md) | The CSP endpoint (e.g. for checks). |"
    );
    expect(index).toContain(
      "| [`FRAME_NAME`](FRAME_NAME.md) | The prefix for the iframe `name` attribute. |"
    );
  });
});
