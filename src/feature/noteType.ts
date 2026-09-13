import type { App, Plugin, TFile } from "obsidian";

export const NOTE_TYPE_PROPERTY = "type";
export const BADGE_CLASS = "minutiae-type-badge";
const MARK_ATTR = "data-minutiae-typed";

export function normalizeNoteType(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeNoteType(item);
      if (normalized) return normalized;
    }
  }
  return null;
}

export function getNoteTypeFromFrontmatter(
  frontmatter: Record<string, unknown> | null | undefined,
): string | null {
  if (!frontmatter) return null;
  return normalizeNoteType(frontmatter[NOTE_TYPE_PROPERTY]);
}

export function getNoteType(app: App, file: TFile): string | null {
  return getNoteTypeFromFrontmatter(app.metadataCache.getFileCache(file)?.frontmatter);
}

function isFile(found: unknown): found is TFile {
  return !!found && typeof found === "object" && "extension" in found && "basename" in found;
}

function resolveFile(app: App, path: string | null, title: string | null): TFile | null {
  if (path) {
    const found = app.vault.getAbstractFileByPath(path);
    return isFile(found) ? found : null;
  }
  if (title) {
    const name = title.trim();
    if (!name) return null;
    for (const file of app.vault.getMarkdownFiles()) {
      if (file.basename === name || file.name === name || file.path === name) return file;
    }
  }
  return null;
}

function upsertBadge(target: Element, type: string | null): void {
  const existing = target.querySelector(`:scope > .${BADGE_CLASS}`);
  if (!type) {
    existing?.remove();
    return;
  }
  if (existing) {
    if (existing.textContent !== type) existing.textContent = type;
    return;
  }
  const badge = document.createElement("span");
  badge.className = BADGE_CLASS;
  badge.textContent = type;
  target.appendChild(badge);
}

function decorate(el: Element, app: App): void {
  const rawPath =
    el.getAttribute("data-path") ?? el.closest("[data-path]")?.getAttribute("data-path");
  const path = rawPath ?? null;
  const target = el.matches(".search-result-file-title")
    ? el
    : (el.querySelector(".nav-file-title-content, .suggestion-title") ?? el);
  const file = resolveFile(app, path, path ? null : (target.textContent ?? null));
  if (!file) return;
  if (el.getAttribute(MARK_ATTR) === file.path) {
    upsertBadge(target, getNoteType(app, file));
    return;
  }
  el.setAttribute(MARK_ATTR, file.path);
  upsertBadge(target, getNoteType(app, file));
}

export function registerNoteTypeBadges(plugin: Plugin, isEnabled: () => boolean): void {
  if (typeof document === "undefined") return;
  const { app } = plugin;
  const nextFrame =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (cb: () => void) => window.setTimeout(cb, 16);

  const refresh = () => {
    if (!isEnabled()) {
      document.querySelectorAll(`.${BADGE_CLASS}`).forEach((el) => el.remove());
      document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => el.removeAttribute(MARK_ATTR));
      return;
    }
    const selector = ".nav-file-title[data-path], .search-result-file-title, .suggestion-item";
    document.querySelectorAll(selector).forEach((el) => {
      try {
        decorate(el, app);
      } catch {
        // Best-effort decoration, never break Obsidian UI.
      }
    });
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    nextFrame(() => {
      scheduled = false;
      refresh();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  plugin.register(() => observer.disconnect());
  plugin.registerEvent(
    app.metadataCache.on("changed", (file) => {
      document
        .querySelectorAll(`[${MARK_ATTR}="${CSS.escape(file.path)}"]`)
        .forEach((el) => el.removeAttribute(MARK_ATTR));
      schedule();
    }),
  );
  plugin.registerEvent(
    app.vault.on("rename", () => {
      document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => el.removeAttribute(MARK_ATTR));
      schedule();
    }),
  );
  schedule();
}
