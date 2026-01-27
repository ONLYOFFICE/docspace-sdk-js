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

import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { build } from "esbuild";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const COPYRIGHT_BANNER = `/**
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
 */`;

const baseOptions = {
  bundle: true,
  minify: true,
  treeShaking: true,
  logLevel: "info",
  sourcemap: false,
  legalComments: "none",
  banner: { js: COPYRIGHT_BANNER },
};

function createBuildConfig(format, output, entry, options = {}) {
  return {
    ...baseOptions,
    format,
    entryPoints: [entry],
    ...(format === "iife" ? { outfile: output } : { outdir: output }),
    ...options,
  };
}

function generateDeclarations() {
  console.log("Generating TypeScript declarations...");

  const configPath = join(rootDir, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")
    );
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    rootDir
  );

  parsedConfig.options.outDir = join(rootDir, "dist", "types");
  parsedConfig.options.declaration = true;
  parsedConfig.options.emitDeclarationOnly = true;

  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  const emitResult = program.emit();

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  if (diagnostics.length > 0) {
    const formatHost = {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    };
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));

    const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length > 0) {
      throw new Error("TypeScript compilation failed");
    }
  }

  console.log("TypeScript declarations generated successfully");
}

async function cleanDist() {
  console.log("Cleaning dist directory...");
  await rm("./dist", { recursive: true, force: true });
}

async function buildAll() {
  try {
    await cleanDist();

    await Promise.all([
      build(
        createBuildConfig("esm", "./dist/esm", "./src/main.ts", {
          platform: "neutral",
          target: ["es2020"],
          splitting: false,
          mainFields: ["module", "main"],
        })
      ),

      build(
        createBuildConfig("cjs", "./dist/cjs", "./src/main.ts", {
          platform: "node",
          target: ["node18"],
          mainFields: ["main", "module"],
        })
      ),

      build(
        createBuildConfig("iife", "./dist/api.js", "./src/main.browser.ts", {
          platform: "browser",
          target: ["es2020", "chrome80", "firefox80", "safari14", "edge80"],
        })
      ),

      Promise.resolve().then(generateDeclarations),
    ]);

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

buildAll();
