import type { Plugin, TFile } from "obsidian";

export const SPLIT_EXPLORER_CLASS = "minutiae-split-explorer";
const SPLIT_CONTAINER_CLASS = "minutiae-split-files";
const RECENT_CONTAINER_CLASS = "minutiae-split-recent";
const SELECTED_FOLDER_CLASS = "minutiae-selected-folder";
export function normalizeFolderPath(folderPath: string | null | undefined): string | null {
  if (!folderPath) return null;
  const trimmed = folderPath.trim().replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

export function getRelativeSubfolder(
  filePath: string,
  selectedFolderPath: string | null | undefined,
): string | null {
  const folder = normalizeFolderPath(selectedFolderPath);
  if (!folder) return null;
  const prefix = `${folder}/`;
  if (!filePath.startsWith(prefix)) return null;
  const rel = filePath.slice(prefix.length);
  const lastSlash = rel.lastIndexOf("/");
  return lastSlash === -1 ? null : rel.slice(0, lastSlash);
}

export function filterFilesForFolder<
  T extends { path: string; name: string; stat?: { mtime: number } },
>(files: readonly T[], selectedFolderPath: string | null | undefined): T[] {
  const folder = normalizeFolderPath(selectedFolderPath);
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  if (folder === null) {
    return files
      .filter((file) => !file.path.includes("/"))
      .sort((a, b) => {
        const mtimeDiff = (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0);
        return mtimeDiff !== 0 ? mtimeDiff : collator.compare(a.name, b.name);
      });
  }

  const prefix = `${folder}/`;
  return files
    .filter((file) => file.path.startsWith(prefix))
    .sort((a, b) => {
      const mtimeDiff = (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0);
      if (mtimeDiff !== 0) return mtimeDiff;
      const aSub = getRelativeSubfolder(a.path, folder);
      const bSub = getRelativeSubfolder(b.path, folder);
      if ((aSub === null) !== (bSub === null)) {
        return aSub === null ? -1 : 1;
      }
      if (aSub !== null && bSub !== null && aSub !== bSub) {
        return collator.compare(aSub, bSub);
      }
      return collator.compare(a.name, b.name);
    });
}

export function resolveRecentFiles<T extends { path: string }>(
  files: readonly T[],
  recentPaths: readonly string[],
  activePath?: string | null,
  limit = 10,
): T[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const seen = new Set<string>();
  const result: T[] = [];
  const candidates = activePath ? [activePath, ...recentPaths] : recentPaths;

  for (const path of candidates) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const file = byPath.get(path);
    if (file) {
      result.push(file);
      if (result.length >= limit) break;
    }
  }
  return result;
}

export function registerSplitExplorer(plugin: Plugin, isEnabled: () => boolean): () => void {
  if (typeof document === "undefined") return () => {};
  const { app } = plugin;
  let selectedFolderPath: string | null = null;
  let topRatio = 36;
  let bottomRatio = 26;

  const syncSelectionClasses = (root: ParentNode) => {
    root
      .querySelectorAll<HTMLElement>(
        '.workspace-leaf-content[data-type="file-explorer"] .nav-files-container .nav-folder-title[data-path]',
      )
      .forEach((el) => {
        const path = normalizeFolderPath(el.getAttribute("data-path"));
        const isSelected = selectedFolderPath !== null && path === selectedFolderPath;
        if (el.classList.contains(SELECTED_FOLDER_CLASS) !== isSelected) {
          el.classList.toggle(SELECTED_FOLDER_CLASS, isSelected);
        }
      });
  };

  type FileExplorerView = {
    onFileContextMenu?: (evt: MouseEvent, file: TFile) => void;
    startRenameFile?: (target?: unknown) => void;
  };

  // The native explorer's inline rename targets `.nav-file`s we hide, so route it to the OS/rename modal.
  let patchedViews = new WeakSet<object>();
  const renameRestores: Array<() => void> = [];

  const patchRenameOnce = (view: FileExplorerView) => {
    if (patchedViews.has(view) || typeof view.startRenameFile !== "function") return;
    patchedViews.add(view);
    const original = view.startRenameFile;
    view.startRenameFile = (target?: unknown) => {
      if (isEnabled() && target && typeof target === "object" && !("children" in target)) {
        const fileManager = app.fileManager as {
          promptForFileRename?: (file: TFile) => Promise<void>;
        };
        if (fileManager.promptForFileRename) {
          void fileManager.promptForFileRename(target as TFile);
          return;
        }
      }
      original.call(view, target);
    };
    renameRestores.push(() => {
      view.startRenameFile = original;
    });
  };

  const openFileContextMenu = (evt: MouseEvent, file: TFile) => {
    const view = app.workspace.getLeavesOfType("file-explorer")[0]?.view as unknown as
      | FileExplorerView
      | undefined;
    if (!view?.onFileContextMenu) return;
    patchRenameOnce(view);
    view.onFileContextMenu(evt, file);
  };

  const createFileItemEl = (file: TFile, activePath: string, subfolder: string | null) => {
    const itemEl = document.createElement("div");
    itemEl.className = "tree-item nav-file";

    const selfEl = document.createElement("div");
    selfEl.className = "tree-item-self is-clickable nav-file-title";
    if (file.path === activePath) selfEl.classList.add("is-active");
    selfEl.setAttribute("data-path", file.path);

    const contentEl = document.createElement("div");
    contentEl.className = "tree-item-inner nav-file-title-content";
    contentEl.textContent = file.extension === "md" ? file.basename : file.name;
    selfEl.appendChild(contentEl);

    if (subfolder) {
      const subEl = document.createElement("span");
      subEl.className = "minutiae-split-subfolder-badge";
      subEl.textContent = `${subfolder}/`;
      selfEl.appendChild(subEl);
    }

    if (file.extension !== "md") {
      const tagEl = document.createElement("div");
      tagEl.className = "nav-file-tag";
      tagEl.textContent = file.extension.toUpperCase();
      selfEl.appendChild(tagEl);
    }

    selfEl.addEventListener("click", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      void app.workspace.getLeaf(evt.metaKey || evt.ctrlKey ? "tab" : false).openFile(file);
    });

    selfEl.addEventListener("auxclick", (evt) => {
      if (evt.button === 1) {
        evt.preventDefault();
        evt.stopPropagation();
        void app.workspace.getLeaf("tab").openFile(file);
      }
    });

    selfEl.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      openFileContextMenu(evt, file);
    });

    itemEl.appendChild(selfEl);
    return itemEl;
  };

  const renderExplorerPane = (
    leafContent: HTMLElement,
    files: TFile[],
    recentFiles: TFile[],
    activePath: string,
  ) => {
    const navFiles = leafContent.querySelector<HTMLElement>(":scope > .nav-files-container");
    if (!navFiles) return;
    leafContent.style.setProperty("--minutiae-top-ratio", `${topRatio}%`);
    leafContent.style.setProperty("--minutiae-bottom-ratio", `${bottomRatio}%`);

    let splitEl = leafContent.querySelector<HTMLElement>(`:scope > .${SPLIT_CONTAINER_CLASS}`);
    if (!splitEl) {
      splitEl = document.createElement("div");
      splitEl.className = SPLIT_CONTAINER_CLASS;
      navFiles.insertAdjacentElement("afterend", splitEl);
    }

    let recentEl = leafContent.querySelector<HTMLElement>(`:scope > .${RECENT_CONTAINER_CLASS}`);
    if (!recentEl) {
      recentEl = document.createElement("div");
      recentEl.className = `${SPLIT_CONTAINER_CLASS} ${RECENT_CONTAINER_CLASS}`;
      splitEl.insertAdjacentElement("afterend", recentEl);
    }

    const folder = normalizeFolderPath(selectedFolderPath);
    const sig = `${folder ?? "/"}|${activePath}|${files.map((f) => f.path).join("\0")}`;
    if (splitEl.getAttribute("data-minutiae-sig") !== sig) {
      splitEl.setAttribute("data-minutiae-sig", sig);
      splitEl.replaceChildren();

      const headerEl = document.createElement("div");
      headerEl.className = "minutiae-split-files-header";

      const titleWrapEl = document.createElement("div");
      titleWrapEl.className = "minutiae-split-files-title-wrap";

      const titleEl = document.createElement("span");
      titleEl.className = "minutiae-split-files-title";
      titleEl.textContent = folder ?? "/";
      titleWrapEl.appendChild(titleEl);

      const countEl = document.createElement("span");
      countEl.className = "minutiae-split-files-count";
      countEl.textContent = String(files.length);
      titleWrapEl.appendChild(countEl);
      headerEl.appendChild(titleWrapEl);

      if (folder !== null) {
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "minutiae-split-files-reset";
        resetBtn.textContent = "루트";
        resetBtn.title = "선택 해제 (루트 파일 보기)";
        resetBtn.addEventListener("click", (evt) => {
          evt.stopPropagation();
          selectedFolderPath = null;
          refresh();
        });
        headerEl.appendChild(resetBtn);
      }

      const listEl = document.createElement("div");
      listEl.className = "minutiae-split-files-list";

      if (files.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "minutiae-split-files-empty";
        emptyEl.textContent = "파일 없음";
        listEl.appendChild(emptyEl);
      } else {
        for (const file of files) {
          listEl.appendChild(
            createFileItemEl(file, activePath, getRelativeSubfolder(file.path, folder)),
          );
        }
      }

      const topResizer = document.createElement("div");
      topResizer.className = "minutiae-split-resizer";
      topResizer.setAttribute("data-resizer", "top");
      splitEl.append(topResizer, headerEl, listEl);
    }

    const recentSig = `${activePath}|${recentFiles.map((f) => f.path).join("\0")}`;
    if (recentEl.getAttribute("data-minutiae-sig") !== recentSig) {
      recentEl.setAttribute("data-minutiae-sig", recentSig);
      recentEl.replaceChildren();

      const recentHeaderEl = document.createElement("div");
      recentHeaderEl.className = "minutiae-split-files-header";

      const recentTitleWrapEl = document.createElement("div");
      recentTitleWrapEl.className = "minutiae-split-files-title-wrap";

      const recentTitleEl = document.createElement("span");
      recentTitleEl.className = "minutiae-split-files-title";
      recentTitleEl.textContent = "최근 문서";
      recentTitleWrapEl.appendChild(recentTitleEl);

      const recentCountEl = document.createElement("span");
      recentCountEl.className = "minutiae-split-files-count";
      recentCountEl.textContent = String(recentFiles.length);
      recentTitleWrapEl.appendChild(recentCountEl);
      recentHeaderEl.appendChild(recentTitleWrapEl);

      const recentListEl = document.createElement("div");
      recentListEl.className = "minutiae-split-files-list";

      if (recentFiles.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "minutiae-split-files-empty";
        emptyEl.textContent = "최근 문서 없음";
        recentListEl.appendChild(emptyEl);
      } else {
        for (const file of recentFiles) {
          const lastSlash = file.path.lastIndexOf("/");
          const parentFolder = lastSlash === -1 ? null : file.path.slice(0, lastSlash);
          recentListEl.appendChild(createFileItemEl(file, activePath, parentFolder));
        }
      }

      const bottomResizer = document.createElement("div");
      bottomResizer.className = "minutiae-split-resizer";
      bottomResizer.setAttribute("data-resizer", "bottom");
      recentEl.append(bottomResizer, recentHeaderEl, recentListEl);
    }
  };

  const cleanup = () => {
    document.body.classList.remove(SPLIT_EXPLORER_CLASS);
    document
      .querySelectorAll(`.${SPLIT_CONTAINER_CLASS}, .${RECENT_CONTAINER_CLASS}`)
      .forEach((el) => el.remove());
    document
      .querySelectorAll(`.${SELECTED_FOLDER_CLASS}`)
      .forEach((el) => el.classList.remove(SELECTED_FOLDER_CLASS));
    renameRestores.splice(0).forEach((restore) => restore());
    patchedViews = new WeakSet<object>();
  };

  const refresh = () => {
    if (!isEnabled()) {
      cleanup();
      return;
    }

    document.body.classList.add(SPLIT_EXPLORER_CLASS);

    if (selectedFolderPath !== null) {
      const target = app.vault.getAbstractFileByPath(selectedFolderPath);
      if (!target || !("children" in target)) {
        selectedFolderPath = null;
      }
    }

    syncSelectionClasses(document);

    const allFiles = app.vault.getFiles();
    const filtered = filterFilesForFolder(allFiles, selectedFolderPath);
    const activePath = app.workspace.getActiveFile()?.path ?? "";
    const recentFiles = resolveRecentFiles(allFiles, app.workspace.getLastOpenFiles(), activePath);

    document
      .querySelectorAll<HTMLElement>('.workspace-leaf-content[data-type="file-explorer"]')
      .forEach((leafContent) => {
        renderExplorerPane(leafContent, filtered, recentFiles, activePath);
      });
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refresh();
    });
  };

  plugin.registerDomEvent(
    document,
    "click",
    (evt: MouseEvent) => {
      if (!isEnabled()) return;
      const target = evt.target;
      if (!(target instanceof Element)) return;

      const navContainer = target.closest(
        '.workspace-leaf-content[data-type="file-explorer"] > .nav-files-container',
      );
      if (!navContainer) return;

      if (target.closest(".collapse-icon, .tree-item-icon, .nav-folder-collapse-indicator")) {
        return;
      }

      const folderTitle = target.closest<HTMLElement>(".nav-folder-title[data-path]");
      if (folderTitle) {
        const titleContent = folderTitle.querySelector<HTMLElement>(".nav-folder-title-content");
        if (titleContent && evt.clientX < titleContent.getBoundingClientRect().left) {
          return;
        }

        const clickedPath = normalizeFolderPath(folderTitle.getAttribute("data-path"));
        if (clickedPath === selectedFolderPath) {
          selectedFolderPath = null;
          evt.preventDefault();
          refresh();
          return;
        }

        selectedFolderPath = clickedPath;
        const folderItem = folderTitle.closest(".nav-folder");
        if (folderItem && !folderItem.classList.contains("is-collapsed")) {
          evt.preventDefault();
        }
        refresh();
        return;
      }

      if (!target.closest(".tree-item-self") && selectedFolderPath !== null) {
        selectedFolderPath = null;
        refresh();
      }
    },
    true,
  );

  plugin.registerDomEvent(document, "pointerdown", (evt: PointerEvent) => {
    if (!isEnabled() || evt.button !== 0) return;
    const target = evt.target;
    if (!(target instanceof Element)) return;
    const resizer = target.closest<HTMLElement>(".minutiae-split-resizer[data-resizer]");
    if (!resizer) return;

    const leafContent = resizer.closest<HTMLElement>(
      '.workspace-leaf-content[data-type="file-explorer"]',
    );
    if (!leafContent) return;
    const navFiles = leafContent.querySelector<HTMLElement>(":scope > .nav-files-container");
    const splitEl = leafContent.querySelector<HTMLElement>(
      `:scope > .${SPLIT_CONTAINER_CLASS}:not(.${RECENT_CONTAINER_CLASS})`,
    );
    const recentEl = leafContent.querySelector<HTMLElement>(`:scope > .${RECENT_CONTAINER_CLASS}`);
    if (!navFiles || !splitEl || !recentEl) return;

    evt.preventDefault();
    const which = resizer.getAttribute("data-resizer");
    const startY = evt.clientY;
    const leafH = leafContent.clientHeight || 1;
    const startTopH = navFiles.getBoundingClientRect().height;
    const startMidH = splitEl.getBoundingClientRect().height;
    const startBotH = recentEl.getBoundingClientRect().height;
    const minH = 64;

    resizer.classList.add("is-dragging");
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const onMove = (moveEvt: PointerEvent) => {
      const dy = moveEvt.clientY - startY;
      if (which === "top") {
        const maxTop = Math.max(minH, startTopH + startMidH - minH);
        const nextTopH = Math.min(maxTop, Math.max(minH, startTopH + dy));
        topRatio = Number(((nextTopH / leafH) * 100).toFixed(2));
      } else {
        const maxBot = Math.max(minH, startMidH + startBotH - minH);
        const nextBotH = Math.min(maxBot, Math.max(minH, startBotH - dy));
        bottomRatio = Number(((nextBotH / leafH) * 100).toFixed(2));
      }
      leafContent.style.setProperty("--minutiae-top-ratio", `${topRatio}%`);
      leafContent.style.setProperty("--minutiae-bottom-ratio", `${bottomRatio}%`);
    };

    const onUp = () => {
      resizer.classList.remove("is-dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  plugin.registerDomEvent(document, "dblclick", (evt: MouseEvent) => {
    if (!isEnabled()) return;
    const target = evt.target;
    if (!(target instanceof Element)) return;
    const resizer = target.closest<HTMLElement>(".minutiae-split-resizer[data-resizer]");
    if (!resizer) return;
    const leafContent = resizer.closest<HTMLElement>(
      '.workspace-leaf-content[data-type="file-explorer"]',
    );
    if (!leafContent) return;
    if (resizer.getAttribute("data-resizer") === "top") {
      topRatio = 36;
    } else {
      bottomRatio = 26;
    }
    leafContent.style.setProperty("--minutiae-top-ratio", `${topRatio}%`);
    leafContent.style.setProperty("--minutiae-bottom-ratio", `${bottomRatio}%`);
  });

  const observer = new MutationObserver((records) => {
    const relevant = records.some(
      (r) =>
        !(
          r.target instanceof Element &&
          r.target.closest(`.${SPLIT_CONTAINER_CLASS}, .${RECENT_CONTAINER_CLASS}`)
        ),
    );
    if (relevant) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  plugin.register(() => {
    observer.disconnect();
    cleanup();
  });

  plugin.registerEvent(app.workspace.on("file-open", schedule));
  plugin.registerEvent(app.workspace.on("layout-change", schedule));
  plugin.registerEvent(app.vault.on("create", schedule));
  plugin.registerEvent(app.vault.on("delete", schedule));
  plugin.registerEvent(app.vault.on("modify", schedule));
  plugin.registerEvent(
    app.vault.on("rename", (file, oldPath) => {
      if (selectedFolderPath === oldPath) {
        selectedFolderPath = normalizeFolderPath(file.path);
      } else if (selectedFolderPath && selectedFolderPath.startsWith(`${oldPath}/`)) {
        selectedFolderPath = normalizeFolderPath(
          `${file.path}${selectedFolderPath.slice(oldPath.length)}`,
        );
      }
      schedule();
    }),
  );

  schedule();
  return refresh;
}
