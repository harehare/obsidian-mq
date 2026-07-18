import { App, Modal, Setting } from "obsidian";

export type QueryScope = "note" | "selection";
export type QueryAction = "replace" | "insert" | "copy";

export interface QueryInputResult {
  query: string;
  scope: QueryScope;
  action: QueryAction;
}

export class QueryInputModal extends Modal {
  private query = "";
  private queryScope: QueryScope;
  private action: QueryAction = "replace";
  private readonly hasSelection: boolean;
  private readonly onSubmit: (result: QueryInputResult) => void;

  constructor(app: App, hasSelection: boolean, onSubmit: (result: QueryInputResult) => void) {
    super(app);
    this.hasSelection = hasSelection;
    this.queryScope = hasSelection ? "selection" : "note";
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Run mq query" });

    new Setting(contentEl).setName("Query").setDesc("mq query, e.g. .h1 or .todo").addTextArea((text) => {
      text.inputEl.rows = 4;
      text.inputEl.addClass("mq-query-input");
      text.setPlaceholder(".[]").onChange((value) => {
        this.query = value;
      });
      text.inputEl.focus();
    });

    new Setting(contentEl)
      .setName("Scope")
      .setDesc(this.hasSelection ? "Query the whole note or only the current selection." : "No text is selected, so only the whole note is available.")
      .addDropdown((dropdown) => {
        dropdown.addOption("note", "Whole note");
        dropdown.addOption("selection", "Selection");
        dropdown.setDisabled(!this.hasSelection);
        dropdown.setValue(this.queryScope);
        dropdown.onChange((value) => {
          this.queryScope = value as QueryScope;
        });
      });

    new Setting(contentEl)
      .setName("Action")
      .setDesc("What to do with the query result.")
      .addDropdown((dropdown) => {
        dropdown.addOption("replace", "Replace scope with result");
        dropdown.addOption("insert", "Insert result below");
        dropdown.addOption("copy", "Copy to clipboard");
        dropdown.setValue(this.action);
        dropdown.onChange((value) => {
          this.action = value as QueryAction;
        });
      });

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText("Run")
        .setCta()
        .onClick(() => {
          if (this.query.trim().length === 0) return;
          this.close();
          this.onSubmit({ query: this.query, scope: this.queryScope, action: this.action });
        }),
    );

    contentEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (this.query.trim().length === 0) return;
        this.close();
        this.onSubmit({ query: this.query, scope: this.queryScope, action: this.action });
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
