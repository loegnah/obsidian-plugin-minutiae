import { watch } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { builtinModules } from "node:module";

const prod = process.argv.includes("production");
const isWatch = process.argv.includes("--watch");
const outdir = "dist";

const external = [
  "obsidian",
  "electron",
  "@codemirror/*",
  "@lezer/*",
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

async function copyAssets() {
  await Promise.all([
    copyFile("manifest.json", `${outdir}/manifest.json`),
    copyFile("src/styles.css", `${outdir}/styles.css`),
  ]);
}

async function bundle() {
  await mkdir(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: ["src/main.ts"],
    outdir,
    naming: "main.js",
    format: "cjs",
    target: "browser",
    external,
    sourcemap: prod ? "none" : "inline",
    minify: prod,
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    if (!isWatch) process.exit(1);
    return;
  }
  await copyAssets();
  console.log(`[${new Date().toLocaleTimeString()}] Built to ${outdir}/`);
}

await bundle();

if (isWatch) {
  console.log("Watching src/ and manifest.json for changes...");
  watch("src", { recursive: true }, async () => {
    await bundle();
  });
  watch("manifest.json", async () => {
    await copyAssets();
  });
}
