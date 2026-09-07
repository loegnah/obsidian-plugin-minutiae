import { App, PluginSettingTab, Setting } from "obsidian";
import type MinutiaePlugin from "./main";

export interface MinutiaeSettings {
  exampleToggle: boolean;
  codeBlockSelectAll: boolean;
}

export const DEFAULT_SETTINGS: MinutiaeSettings = {
  exampleToggle: false,
  codeBlockSelectAll: true,
};

export class MinutiaeSettingTab extends PluginSettingTab {
  plugin: MinutiaePlugin;

  constructor(app: App, plugin: MinutiaePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Example toggle")
      .setDesc("Toggle an example minor tweak.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.exampleToggle)
          .onChange(async (value) => {
            this.plugin.settings.exampleToggle = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Code block select all")
      .setDesc("Scope Cmd/Ctrl+A to select code block contents first.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.codeBlockSelectAll)
          .onChange(async (value) => {
            this.plugin.settings.codeBlockSelectAll = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
