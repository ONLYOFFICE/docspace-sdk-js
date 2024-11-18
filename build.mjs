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

const options = {
  bundle: true,
  minify: true,
  treeShaking: true,
  logLevel: "info",
  sourcemap: false,
};

async function buildAll() {
  Promise.all([
    await build({
      format: "esm",
      outdir: "dist/esm",
      entryPoints: ["./src/main.ts"],
      plugins: [
        esbuildPluginTsc({ force: true }),
        {
          name: "TypeScriptDeclarationsPlugin",
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) return;
              execSync("tsc --outDir ./dist/types");
            });
          },
        },
      ],
      ...options,
    }).catch(() => process.exit(1)),

    await build({
      format: "cjs",
      outdir: "dist/cjs",
      entryPoints: ["./src/main.ts"],
      plugins: [
        esbuildPluginTsc({ force: true })
      ],
      ...options,
    }).catch(() => process.exit(1)),

    await build({
      format: "iife",
      outfile: "./dist/api.js",
      entryPoints: ["./src/main.browser.ts"],
      ...options,
    }).catch(() => process.exit(1)),
  ]);
}

buildAll();
