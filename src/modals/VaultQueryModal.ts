import { App, Modal, Setting } from "obsidian";

export type VaultQueryAction = "report" | "update";

export interface VaultQueryInput {
  query: string;
  folder: string;
  tag: string;
  action: VaultQueryAction;
  preserveStructure: boolean;
}

export class VaultQueryModal extends Modal {
  private query = "";
  private folder = "";
  private tag = "";
  private action: VaultQueryAction = "report";
  private preserveStructure = false;
  private readonly onSubmit: (input: VaultQueryInput) => void;

  constructor(app: App, onSubmit: (input: VaultQueryInput) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Run mq query across the vault" });

    new Setting(contentEl).setName("Query").setDesc("Mq query applied to every matching note.").addTextArea((text) => {
      text.inputEl.rows = 4;
      text.inputEl.addClass("mq-query-input");
      text.setPlaceholder(".[]").onChange((value) => {
        this.query = value;
      });
      text.inputEl.focus();
    });

    new Setting(contentEl)
      .setName("Folder")
      .setDesc("Limit to notes in this folder (recursive). Leave empty for the whole vault.")
      .addText((text) => text.setPlaceholder("Projects").onChange((value) => (this.folder = value)));

    new Setting(contentEl)
      .setName("Tag")
      .setDesc("Limit to notes carrying this tag. Leave empty to not filter by tag.")
      .addText((text) => text.setPlaceholder("#Project").onChange((value) => (this.tag = value)));

    new Setting(contentEl)
      .setName("Action")
      .setDesc('"report" is non-destructive: results are collected into a new note. "update files" overwrites each matching note.')
      .addDropdown((dropdown) => {
        dropdown.addOption("report", "Report to a new note");
        dropdown.addOption("update", "Update files in place");
        dropdown.setValue(this.action);
        dropdown.onChange((value) => {
          this.action = value as VaultQueryAction;
          preserveStructureSetting.settingEl.toggleClass("mq-hidden", this.action !== "update");
        });
      });

    const preserveStructureSetting = new Setting(contentEl)
      .setName("Preserve non-matching content")
      .setDesc("Merge the query result back into each note (like mq --update) instead of replacing the whole note with the result.")
      .addToggle((toggle) => toggle.setValue(this.preserveStructure).onChange((value) => (this.preserveStructure = value)));
    preserveStructureSetting.settingEl.toggleClass("mq-hidden", this.action !== "update");

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText("Run")
        .setCta()
        .onClick(() => {
          if (this.query.trim().length === 0) return;
          this.close();
          this.onSubmit({
            query: this.query,
            folder: this.folder,
            tag: this.tag,
            action: this.action,
            preserveStructure: this.preserveStructure,
          });
        }),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
