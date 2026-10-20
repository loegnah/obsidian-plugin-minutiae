import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

import { resolveDeployPath } from "./setup";

interface DeployConfig {
  targetDir: string;
}

function getDeployConfig(): DeployConfig | null {
  const configPath = ".deploy.json";
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as DeployConfig;
  } catch {
    return null;
  }
}

const arg = process.argv[2]?.trim();
const baseDir = arg ? resolveDeployPath(arg) : getDeployConfig()?.targetDir;

if (!baseDir) {
  console.error("❌ Deploy path not configured. Run 'bun run setup' first.");
  process.exit(1);
}

const pluginTargetDir = baseDir.includes(".obsidian")
  ? baseDir
  : join(baseDir, ".obsidian/plugins/minutiae");
const themeTargetDir = baseDir.includes(".obsidian")
  ? null
  : join(baseDir, ".obsidian/themes/minutiae");

const distDir = "dist";
const themeDir = "theme";

let files: string[];
try {
  files = await readdir(distDir);
} catch {
  console.error("❌ dist/ not found. Run 'bun run build' first.");
  process.exit(1);
}

if (files.length === 0) {
  console.error("❌ dist/ is empty. Run 'bun run build' first.");
  process.exit(1);
}

await mkdir(pluginTargetDir, { recursive: true });
await Promise.all(files.map((file) => copyFile(join(distDir, file), join(pluginTargetDir, file))));
console.log(`✔ Deployed plugin: ${distDir}/ -> ${pluginTargetDir}`);

if (themeTargetDir && existsSync(themeDir)) {
  const themeFiles = await readdir(themeDir);
  await mkdir(themeTargetDir, { recursive: true });
  await Promise.all(
    themeFiles.map((file) => copyFile(join(themeDir, file), join(themeTargetDir, file))),
  );
  console.log(`✔ Deployed theme:  ${themeDir}/ -> ${themeTargetDir}`);
}
