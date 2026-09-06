import { builtinModules } from "node:module";
import { watch } from "node:fs";

const prod = process.argv.includes("production");
const isWatch = process.argv.includes("--watch");

const external = [
  "obsidian",
  "electron",
  "@codemirror/*",
  "@lezer/*",
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

async function bundle() {
  const result = await Bun.build({
    entrypoints: ["src/main.ts"],
    outdir: ".",
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
  console.log(`[${new Date().toLocaleTimeString()}] Built main.js`);
}

await bundle();

if (isWatch) {
  console.log("Watching src/ for changes...");
  watch("src", { recursive: true }, async () => {
    await bundle();
  });
}
