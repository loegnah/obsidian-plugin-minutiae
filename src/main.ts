import { Notice, Plugin, WorkspaceWindow } from "obsidian";

import { createCodeBlockSelectExtension } from "./feature/codeBlockSelect";
import { registerNoteTypeBadges } from "./feature/noteType";
import { DEFAULT_SETTINGS, MinutiaeSettingTab, type MinutiaeSettings } from "./settings";

const WIDE_TABLES_CLASS = "minutiae-wide-tables";

export default class MinutiaePlugin extends Plugin {
  settings: MinutiaeSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.applyWideTables();
    this.registerEvent(
      this.app.workspace.on("window-open", (_workspaceWindow, win) => {
        win.document.body.classList.toggle(WIDE_TABLES_CLASS, this.settings.wideTables);
      }),
    );

    this.addSettingTab(new MinutiaeSettingTab(this.app, this));
    this.registerEditorExtension(
      createCodeBlockSelectExtension(() => this.settings.codeBlockSelectAll),
    );
    registerNoteTypeBadges(this, () => this.settings.noteTypeBadge);

    const statusBarItem = this.addStatusBarItem();
    statusBarItem.setText("✨ Minutiae");

    this.addRibbonIcon("sparkles", "Minutiae", () => {
      new Notice("Minutiae is running!");
    });

    new Notice("Minutiae enabled");

    this.addCommand({
      id: "hello-minutiae",
      name: "Say Hello",
      callback: () => {
        new Notice("Hello from Minutiae!");
      },
    });
  }

  onunload() {
    for (const doc of this.openDocuments()) doc.body.classList.remove(WIDE_TABLES_CLASS);
  }

  applyWideTables() {
    for (const doc of this.openDocuments()) {
      doc.body.classList.toggle(WIDE_TABLES_CLASS, this.settings.wideTables);
    }
  }

  private openDocuments(): Set<Document> {
    const docs = new Set<Document>([document]);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const container = leaf.getContainer();
      if (container instanceof WorkspaceWindow) docs.add(container.doc);
    });
    return docs;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
