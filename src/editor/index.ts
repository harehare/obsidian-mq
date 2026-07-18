import type { Extension } from "@codemirror/state";
import { mqCompletionLanguageData } from "./completion";
import { mqHighlightPlugin } from "./highlight";
import { mqHoverTooltip } from "./hover";
import { mqLinter } from "./lint";

/** Editor support for `mq` code blocks: highlighting, diagnostics, hover and completion. */
export function mqEditorExtensions(): Extension[] {
  return [mqHighlightPlugin, mqLinter, mqHoverTooltip, mqCompletionLanguageData];
}
