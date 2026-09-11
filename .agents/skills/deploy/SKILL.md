---
name: deploy
description: "Deploy Minutiae plugin artifacts to target Obsidian vaults. Use when deploying, syncing build output, or testing in an Obsidian vault."
---

# Deploy Plugin to Obsidian Vault

Guide for building and deploying the Minutiae plugin artifacts (`main.js`, `manifest.json`, `styles.css`) to target Obsidian vaults.

## 1. Prerequisites

Always ensure production build artifacts are up to date in `dist/` before deploying:

```bash
bun run build
```

This compiles TypeScript, bundles `main.js`, and copies `manifest.json` and `src/styles.css` into `dist/`.

## 2. Deployment Commands

Use `bun run deploy` with an optional target vault argument.

### Default Vault (`dev`)

Deploy to `~/note/dev/.obsidian/plugins/minutiae`:

```bash
bun run deploy
```

### Named Vault

Deploy to `~/note/<dirname>/.obsidian/plugins/minutiae` by supplying just the directory name:

```bash
# Deploys to ~/note/work/.obsidian/plugins/minutiae
bun run deploy work
```

### Custom Full Path

Deploy to any vault by supplying an absolute path or path starting with `~`:

```bash
# Path starting with ~
bun run deploy ~/my-notes/.obsidian/plugins/minutiae

# Absolute path
bun run deploy /path/to/vault/.obsidian/plugins/minutiae
```

## 3. Post-Deployment (Obsidian)

After deploying:

1. Open Obsidian.
2. Go to **Settings** -> **Community plugins**.
3. Reload or toggle **Minutiae** off and on to apply changes (or use the Hot Reload plugin).
