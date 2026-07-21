import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MqSettingTab, type MqPluginSettings } from "./settings";
import { registerMqCodeBlockProcessor } from "./codeBlockProcessor";
import { registerRunOnNoteCommand } from "./commands/runOnNote";
import { registerVaultQueryCommand } from "./commands/vaultQuery";
import { mqEditorExtensions } from "./editor";

export default class MqPlugin extends Plugin {
  settings: MqPluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    registerMqCodeBlockProcessor(this);
    registerRunOnNoteCommand(this);
    registerVaultQueryCommand(this);

    if (this.settings.enableEditorSupport) {
      this.registerEditorExtension(mqEditorExtensions());
    }

    this.addSettingTab(new MqSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<MqPluginSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
