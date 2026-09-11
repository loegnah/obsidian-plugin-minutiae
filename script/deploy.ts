import { copyFile, mkdir, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

const arg = process.argv[2]?.trim() || "dev";
const targetDir = arg.startsWith("~")
  ? arg.replace(/^~(?=$|\/)/, homedir())
  : isAbsolute(arg)
    ? arg
    : join(homedir(), "note", arg, ".obsidian/plugins/minutiae");

const distDir = "dist";

let files: string[];
try {
  files = await readdir(distDir);
} catch {
  console.error("dist/ not found. Run 'bun run build' first.");
  process.exit(1);
}

if (files.length === 0) {
  console.error("dist/ is empty. Run 'bun run build' first.");
  process.exit(1);
}

await mkdir(targetDir, { recursive: true });
await Promise.all(files.map((file) => copyFile(join(distDir, file), join(targetDir, file))));

console.log(`Deployed dist/ to ${targetDir}`);
