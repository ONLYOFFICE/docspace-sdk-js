// @ts-check
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_FILE = join(process.cwd(), "typedoc.json");

try {
  const gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf-8",
  }).trim();

  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));

  if (config.gitRevision === gitBranch) {
    console.log(`Revision already set to: ${gitBranch}`);
    process.exit(0);
  }

  config.gitRevision = gitBranch;

  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf-8");

  console.log(`Updated revision to: ${gitBranch}`);
} catch (error) {
  console.error("Error updating revision:", error);
  process.exit(1);
}
