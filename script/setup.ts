import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const DEFAULT_DEPLOY_PATH = "note/brain";

export function resolveDeployPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return join(homedir(), DEFAULT_DEPLOY_PATH);
  }
  if (trimmed.startsWith("~/")) {
    return join(homedir(), trimmed.slice(2));
  }
  if (trimmed === "~") {
    return homedir();
  }
  if (isAbsolute(trimmed)) {
    return resolve(trimmed);
  }
  if (!trimmed.includes("/")) {
    return join(homedir(), "note", trimmed);
  }
  return join(homedir(), trimmed);
}

async function main() {
  let answer = process.argv[2] ?? "";
  if (!answer) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    console.log("Configure deployment target Obsidian vault.");
    console.log("Paths are resolved relative to your home directory (~) or ~/note/<name>.");
    console.log("Example: 'brain' or 'note/brain' -> '~/note/brain'\n");

    answer = await rl.question("Enter vault directory [default: ~/note/brain]: ");
    rl.close();
  }

  const resolved = resolveDeployPath(answer);
  const config = { targetDir: resolved };
  writeFileSync(".deploy.json", `${JSON.stringify(config, null, 2)}\n`);

  console.log(`\n✔ Deploy path saved: ${resolved}`);
  console.log("Run 'bun run deploy' to build and copy plugin + theme.");
}

if (import.meta.main) {
  await main();
}
