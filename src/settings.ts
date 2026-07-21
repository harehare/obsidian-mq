import { App, Notice, PluginSettingTab } from "obsidian";
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

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "mq",
        desc: "Run mq, a jq-like query language for Markdown.",
        render: (setting) => {
          setting.setHeading();
        },
      },
      {
        name: "List style",
        desc: "Marker used when a query result renders a list back to Markdown.",
        control: {
          type: "dropdown",
          key: "listStyle",
          options: { dash: "- dash", plus: "+ plus", star: "* star" },
        },
      },
      {
        name: "Link title style",
        desc: 'Quoting used for link titles, e.g. [text](url "title").',
        control: {
          type: "dropdown",
          key: "linkTitleStyle",
          options: { paren: "(paren)", double: '"double"', single: "'single'" },
        },
      },
      {
        name: "Link URL style",
        desc: "Whether link URLs are wrapped in angle brackets, e.g. <https://...>.",
        control: {
          type: "dropdown",
          key: "linkUrlStyle",
          options: { none: "none", angle: "<angle>" },
        },
      },
      {
        name: "Query timeout (ms)",
        desc: "Queries running longer than this are aborted. Applies to code blocks, commands and vault-wide queries.",
        control: {
          type: "number",
          key: "timeoutMs",
          min: 1,
          defaultValue: DEFAULT_SETTINGS.timeoutMs,
        },
      },
      {
        name: "Allowed import domains",
        desc:
          "Comma-separated domains allowed for `import`/`include \"https://...\"`. " +
          "github.com/harehare is always allowed. Module imports require OPFS support in this environment.",
        render: (setting) => {
          setting.addText((text) =>
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
        },
      },
      {
        name: "Auto-refresh query blocks",
        desc: "Re-render `mq` code blocks automatically when the note(s) they query are modified.",
        control: { type: "toggle", key: "autoRefreshBlocks" },
      },
      {
        name: "Editor support",
        desc: "Syntax highlighting, diagnostics, hover and autocomplete inside `mq` code blocks in Live Preview / Source mode.",
        render: (setting) => {
          setting.addToggle((toggle) =>
            toggle.setValue(this.plugin.settings.enableEditorSupport).onChange(async (value) => {
              this.plugin.settings.enableEditorSupport = value;
              await this.plugin.saveSettings();
              new Notice("Reload Obsidian for this change to take full effect.");
            }),
          );
        },
      },
      {
        name: "Dataview integration",
        desc: 'Allow `mq` code blocks with a `dataview="DQL query"` param to feed Dataview query results into mq (requires the Dataview plugin).',
        control: { type: "toggle", key: "enableDataviewIntegration" },
      },
    ];
  }
}
