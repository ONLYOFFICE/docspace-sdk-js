/*
 * (c) Copyright Ascensio System SIA 2024
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
 */

import { build } from "esbuild";
import { execSync } from "child_process";
import esbuildPluginTsc from "esbuild-plugin-tsc";

const baseOptions = {
  bundle: true,
  minify: true,
  treeShaking: true,
  logLevel: "info",
  sourcemap: false,
};

const createBuildConfig = (format, output, entry, additionalPlugins = []) => ({
  ...baseOptions,
  format,
  entryPoints: [entry],
  ...(format === "iife" ? { outfile: output } : { outdir: output }),
  plugins: additionalPlugins,
});

const typescriptPlugin = esbuildPluginTsc({ force: true });
const declarationsPlugin = {
  name: "TypeScriptDeclarationsPlugin",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        execSync("tsc --outDir ./dist/types");
      }
    });
  },
};

async function buildAll() {
  try {
    await Promise.all([
      build(
        createBuildConfig("esm", "./dist/esm", "./src/main.ts", [
          typescriptPlugin,
          declarationsPlugin,
        ])
      ),
      build(
        createBuildConfig("cjs", "./dist/cjs", "./src/main.ts", [
          typescriptPlugin,
        ])
      ),
      build(
        createBuildConfig("iife", "./dist/api-dev.js", "./src/main.browser.ts")
      ),
    ]);
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildAll();
