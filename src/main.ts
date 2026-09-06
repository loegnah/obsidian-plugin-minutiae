import { Notice, Plugin } from "obsidian";
import {
  DEFAULT_SETTINGS,
  MinutiaeSettingTab,
  type MinutiaeSettings,
} from "./settings";

export default class MinutiaePlugin extends Plugin {
  settings: MinutiaeSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new MinutiaeSettingTab(this.app, this));

    this.addCommand({
      id: "hello-minutiae",
      name: "Say Hello",
      callback: () => {
        new Notice("Hello from Minutiae!");
      },
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
