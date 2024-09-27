import { build } from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";

const option = {
  bundle: true,
  color: true,
  logLevel: "info",
  sourcemap: false,
  entryPoints: ["./src/main.ts"],
  minify: true,
  treeShaking: true,
};

async function run() {
  await build({
    format: "esm",
    outdir: "dist",
    splitting: true,
    plugins: [dtsPlugin()],
    ...option,
  }).catch(() => process.exit(1));

  await build({
    outfile: "./dist/api.js",
    ...option,
  }).catch(() => process.exit(1));
}

run();
