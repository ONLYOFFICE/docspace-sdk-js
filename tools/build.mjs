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
import { build } from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";

const baseOptions = {
  bundle: true,
  minify: true,
  treeShaking: true,
  logLevel: "info",
  sourcemap: false,
  legalComments: "eof",
};

const typescriptPlugin = esbuildPluginTsc({
  force: true,
  tsconfigPath: "./tsconfig.json",
});

const declarationsPlugin = {
  name: "TypeScriptDeclarationsPlugin",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        try {
          execSync("tsc --outDir ./dist/types", { stdio: "inherit" });
        } catch (error) {
          console.error(
            "Failed to generate TypeScript declarations:",
            error.message
          );
          throw error;
        }
      }
    });
  },
};

function createBuildConfig(format, output, entry, options = {}) {
  const config = {
    ...baseOptions,
    format,
    entryPoints: [entry],
    ...(format === "iife" ? { outfile: output } : { outdir: output }),
    ...options,
  };

  return config;
}

async function buildAll() {
  try {
    await Promise.all([
      build(
        createBuildConfig("esm", "./dist/esm", "./src/main.ts", {
          platform: "neutral",
          plugins: [typescriptPlugin, declarationsPlugin],
          target: ["es2020"],
          splitting: false,
          mainFields: ["module", "main"],
        })
      ),

      build(
        createBuildConfig("cjs", "./dist/cjs", "./src/main.ts", {
          platform: "node",
          plugins: [typescriptPlugin],
          target: ["node18"],
          mainFields: ["main", "module"],
        })
      ),

      build(
        createBuildConfig("iife", "./dist/api.js", "./src/main.browser.ts", {
          platform: "browser",
          target: ["es2020", "chrome80", "firefox80", "safari14", "edge80"],
          globalName: "DocSpace",
          minifyWhitespace: true,
          minifyIdentifiers: true,
          minifySyntax: true,
        })
      ),
    ]);
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

buildAll();
