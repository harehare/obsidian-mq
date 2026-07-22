import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type MqPlugin from "./main";

export type ListStyle = "dash" | "plus" | "star";
export type LinkTitleStyle = "double" | "single" | "paren";
export type LinkUrlStyle = "angle" | "none";

export interface MqPluginSettings {
  /** List marker style used when rendering query results back to Markdown. */
  listStyle: ListStyle;
  /** Link title quoting style used when rendering query results back to Markdown. */
  linkTitleStyle: LinkTitleStyle;
  /** Link URL wrapping style used when rendering query results back to Markdown. */
  linkUrlStyle: LinkUrlStyle;
  /** Maximum time in milliseconds a query may run before evaluation is aborted. */
  timeoutMs: number;
  /** Extra domains allowed for `import`/`include` of remote `.mq` modules. */
  allowedDomains: string[];
  /** Re-render `mq` code blocks whenever their source note(s) change on disk. */
  autoRefreshBlocks: boolean;
  /** Enable syntax highlighting, diagnostics, hover and completion inside `mq` code blocks. */
  enableEditorSupport: boolean;
  /** Allow `dataview="..."` code block params to source input from the Dataview plugin. */
  enableDataviewIntegration: boolean;
}

export const DEFAULT_SETTINGS: MqPluginSettings = {
  listStyle: "dash",
  linkTitleStyle: "paren",
  linkUrlStyle: "none",
  timeoutMs: 5000,
  allowedDomains: [],
  autoRefreshBlocks: true,
  enableEditorSupport: true,
  enableDataviewIntegration: true,
};

export class MqSettingTab extends PluginSettingTab {
  plugin: MqPlugin;

  constructor(app: App, plugin: MqPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** Declarative settings, used for in-app settings search on Obsidian 1.13.0+. */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "Run mq, a jq-like query language for Markdown.",
        items: [
          {
            name: "List style",
            desc: "Marker used when a query result renders a list back to Markdown.",
            control: {
              type: "dropdown",
              key: "listStyle",
              options: { dash: "- dash", plus: "+ plus", star: "* star" },
              defaultValue: DEFAULT_SETTINGS.listStyle,
            },
          },
          {
            name: "Link title style",
            desc: 'Quoting used for link titles, e.g. [text](url "title").',
            control: {
              type: "dropdown",
              key: "linkTitleStyle",
              options: { paren: "(paren)", double: '"double"', single: "'single'" },
              defaultValue: DEFAULT_SETTINGS.linkTitleStyle,
            },
          },
          {
            name: "Link URL style",
            desc: "Whether link URLs are wrapped in angle brackets, e.g. <https://...>.",
            control: {
              type: "dropdown",
              key: "linkUrlStyle",
              options: { none: "none", angle: "<angle>" },
              defaultValue: DEFAULT_SETTINGS.linkUrlStyle,
            },
          },
          {
            name: "Query timeout (ms)",
            desc: "Queries running longer than this are aborted. Applies to code blocks, commands and vault-wide queries.",
            control: {
              type: "number",
              key: "timeoutMs",
              placeholder: String(DEFAULT_SETTINGS.timeoutMs),
              defaultValue: DEFAULT_SETTINGS.timeoutMs,
              validate: (value) => {
                if (!Number.isFinite(value) || value <= 0) {
                  return "Enter a positive number of milliseconds.";
                }
              },
            },
          },
          {
            name: "Allowed import domains",
            desc:
              "Comma-separated domains allowed for `import`/`include \"https://...\"`. " +
              "github.com/harehare is always allowed. Module imports require OPFS support in this environment.",
            control: {
              type: "text",
              key: "allowedDomains",
              placeholder: "github.com/my-org, example.com",
            },
          },
          {
            name: "Auto-refresh query blocks",
            desc: "Re-render `mq` code blocks automatically when the note(s) they query are modified.",
            control: {
              type: "toggle",
              key: "autoRefreshBlocks",
              defaultValue: DEFAULT_SETTINGS.autoRefreshBlocks,
            },
          },
          {
            name: "Editor support",
            desc: "Syntax highlighting, diagnostics, hover and autocomplete inside `mq` code blocks in Live Preview / Source mode.",
            control: {
              type: "toggle",
              key: "enableEditorSupport",
              defaultValue: DEFAULT_SETTINGS.enableEditorSupport,
            },
          },
          {
            name: "Dataview integration",
            desc: 'Allow `mq` code blocks with a `dataview="DQL query"` param to feed Dataview query results into mq (requires the Dataview plugin).',
            control: {
              type: "toggle",
              key: "enableDataviewIntegration",
              defaultValue: DEFAULT_SETTINGS.enableDataviewIntegration,
            },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    if (key === "allowedDomains") {
      return this.plugin.settings.allowedDomains.join(", ");
    }
    return super.getControlValue(key);
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "allowedDomains") {
      this.plugin.settings.allowedDomains = String(value)
        .split(",")
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0);
      await this.plugin.saveSettings();
      return;
    }

    await super.setControlValue(key, value);

    if (key === "enableEditorSupport") {
      new Notice("Reload Obsidian for this change to take full effect.");
    }
  }

  /** @deprecated Fallback renderer for Obsidian versions older than 1.13.0. */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setDesc("Run mq, a jq-like query language for Markdown.").setHeading();

    new Setting(containerEl)
      .setName("List style")
      .setDesc("Marker used when a query result renders a list back to Markdown.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ dash: "- dash", plus: "+ plus", star: "* star" })
          .setValue(this.plugin.settings.listStyle)
          .onChange(async (value) => {
            this.plugin.settings.listStyle = value as ListStyle;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Link title style")
      .setDesc('Quoting used for link titles, e.g. [text](URL "title").')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ paren: "(paren)", double: '"double"', single: "'single'" })
          .setValue(this.plugin.settings.linkTitleStyle)
          .onChange(async (value) => {
            this.plugin.settings.linkTitleStyle = value as LinkTitleStyle;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Link URL style")
      .setDesc("Whether link URLs are wrapped in angle brackets, e.g. <https://...>.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ none: "none", angle: "<angle>" })
          .setValue(this.plugin.settings.linkUrlStyle)
          .onChange(async (value) => {
            this.plugin.settings.linkUrlStyle = value as LinkUrlStyle;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Query timeout (ms)")
      .setDesc(
        "Queries running longer than this are aborted. Applies to code blocks, commands and vault-wide queries.",
      )
      .addText((text) =>
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.timeoutMs))
          .setValue(String(this.plugin.settings.timeoutMs))
          .onChange(async (value) => {
            const ms = Number.parseInt(value, 10);
            if (Number.isFinite(ms) && ms > 0) {
              this.plugin.settings.timeoutMs = ms;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Allowed import domains")
      .setDesc(
        "Comma-separated domains allowed for `import`/`include \"https://...\"`. " +
          "github.com/harehare is always allowed. Module imports require OPFS support in this environment.",
      )
      .addText((text) =>
        text
          .setPlaceholder("github.com/my-org, example.com")
          .setValue(this.plugin.settings.allowedDomains.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.allowedDomains = value
              .split(",")
              .map((domain) => domain.trim())
              .filter((domain) => domain.length > 0);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Auto-refresh query blocks")
      .setDesc("Re-render `mq` code blocks automatically when the note(s) they query are modified.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoRefreshBlocks).onChange(async (value) => {
          this.plugin.settings.autoRefreshBlocks = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Editor support")
      .setDesc(
        "Syntax highlighting, diagnostics, hover and autocomplete inside `mq` code blocks in Live Preview / Source mode.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableEditorSupport).onChange(async (value) => {
          this.plugin.settings.enableEditorSupport = value;
          await this.plugin.saveSettings();
          new Notice("Reload Obsidian for this change to take full effect.");
        }),
      );

    new Setting(containerEl)
      .setName("Dataview integration")
      .setDesc(
        'Allow `mq` code blocks with a `dataview="DQL query"` param to feed Dataview query results into mq (requires the Dataview plugin).',
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableDataviewIntegration).onChange(async (value) => {
          this.plugin.settings.enableDataviewIntegration = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
