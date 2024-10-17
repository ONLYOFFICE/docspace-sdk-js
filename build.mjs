import { build } from "esbuild";
import { execSync } from "child_process";
import esbuildPluginTsc from "esbuild-plugin-tsc";

const options = {
  bundle: true,
  minify: true,
  treeShaking: true,
  logLevel: "info",
  sourcemap: false,
  entryPoints: ["./src/main.ts"],
};

async function buildAll() {
  Promise.all([
    await build({
      format: "esm",
      outdir: "dist/esm",
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
      plugins: [
        esbuildPluginTsc({ force: true })
      ],
      ...options,
    }).catch(() => process.exit(1)),

    await build({
      format: "iife",
      outfile: "./dist/api.js",
      ...options,
    }).catch(() => process.exit(1)),
  ]);
}

buildAll();
