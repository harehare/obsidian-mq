import { App, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
  private readonly message: string;
  private readonly confirmText: string;
  private readonly onConfirm: () => void;

  constructor(app: App, message: string, confirmText: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.confirmText = confirmText;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("p", { text: this.message });

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText(this.confirmText)
          // setDestructive() requires Obsidian 1.13+; setWarning() keeps minAppVersion low.
          .setWarning()
          .onClick(() => {
            this.close();
            this.onConfirm();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
