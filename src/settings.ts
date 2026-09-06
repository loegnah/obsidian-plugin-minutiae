import { App, PluginSettingTab, Setting } from "obsidian";
import type MinutiaePlugin from "./main";

export interface MinutiaeSettings {
  exampleToggle: boolean;
}

export const DEFAULT_SETTINGS: MinutiaeSettings = {
  exampleToggle: false,
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
  }
}
