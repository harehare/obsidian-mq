import { MarkdownView, Notice } from "obsidian";
import type MqPlugin from "../main";
import { QueryInputModal, type QueryInputResult } from "../modals/QueryInputModal";
import { run } from "../mq/wasm";

export function registerRunOnNoteCommand(plugin: MqPlugin): void {
  plugin.addCommand({
    id: "run-query-on-note",
    name: "Run query on current note",
    editorCallback: (editor, view) => {
      const hasSelection = editor.somethingSelected();
      new QueryInputModal(plugin.app, hasSelection, (result: QueryInputResult) => {
        void executeQuery(plugin, editor, result);
      }).open();
      void view;
    },
  });
}

async function executeQuery(
  plugin: MqPlugin,
  editor: MarkdownView["editor"],
  { query, scope, action }: QueryInputResult,
): Promise<void> {
  const input = scope === "selection" && editor.somethingSelected() ? editor.getSelection() : editor.getValue();

  let result: string;
  try {
    result = await run(query, input, {
      listStyle: plugin.settings.listStyle,
      linkTitleStyle: plugin.settings.linkTitleStyle,
      linkUrlStyle: plugin.settings.linkUrlStyle,
      timeoutMs: plugin.settings.timeoutMs,
      allowedDomains: plugin.settings.allowedDomains,
    });
  } catch (error) {
    new Notice(`mq error: ${error instanceof Error ? error.message : String(error)}`, 8000);
    return;
  }

  switch (action) {
    case "replace":
      if (scope === "selection") {
        editor.replaceSelection(result);
      } else {
        editor.setValue(result);
      }
      break;
    case "insert":
      if (scope === "selection") {
        const to = editor.getCursor("to");
        editor.replaceRange(`\n\n${result}`, to);
      } else {
        editor.replaceRange(`\n\n${result}`, { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length });
      }
      break;
    case "copy":
      await navigator.clipboard.writeText(result);
      new Notice("Mq: result copied to clipboard.");
      break;
  }
}
