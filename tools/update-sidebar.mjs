// @ts-check
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PATH_PREFIX = "docspace/javascript-sdk/usage-sdk";
const SIDEBAR_FILE = join(process.cwd(), "docs", "typedoc-sidebar.cjs");
const CONFIG_FILE = join(process.cwd(), "typedoc.json");
const DEFAULT_BRANCH = "master";

try {
  let content = readFileSync(SIDEBAR_FILE, "utf-8");

  content = content.replace(
    /id:\s*"([^"]+)"/g,
    (_, id) => `id: "${PATH_PREFIX}/${id}"`
  );

  writeFileSync(SIDEBAR_FILE, content, "utf-8");

  console.log(`Updated sidebar with path prefix: ${PATH_PREFIX}`);

  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));

  config.gitRevision = DEFAULT_BRANCH;

  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  
  console.log(`Reverted revision to: ${DEFAULT_BRANCH}`);
} catch (error) {
  console.error("Error updating sidebar:", error);
  process.exit(1);
}
