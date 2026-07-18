import { App, TFile } from "obsidian";
import type { MqPluginSettings } from "./settings";
import type { MqBlockParams } from "./util/params";
import { dedupeFiles, resolveFileList, resolveFolderList, resolveTagList } from "./util/files";
import { runDataviewQuery } from "./util/dataview";

export interface ResolvedInput {
  content: string;
  sourceLabel: string;
  files: TFile[];
}

/**
 * Resolves what Markdown content an `mq` code block should query, based on its params.
 * `selfContent` is the current note's body with the block's own fence already stripped out,
 * used as the default when no `file`/`folder`/`tag`/`dataview` param is given.
 */
export async function resolveBlockInput(
  app: App,
  sourcePath: string,
  params: MqBlockParams,
  selfContent: string,
  settings: MqPluginSettings,
): Promise<ResolvedInput> {
  if (params.dataview) {
    if (!settings.enableDataviewIntegration) {
      throw new Error("Dataview integration is disabled in mq settings.");
    }
    const content = await runDataviewQuery(app, params.dataview, sourcePath);
    return { content, sourceLabel: `Dataview: ${params.dataview}`, files: [] };
  }

  if (params.file || params.folder || params.tag) {
    const files = dedupeFiles([
      ...(params.file ? resolveFileList(app, params.file, sourcePath) : []),
      ...(params.folder ? resolveFolderList(app, params.folder) : []),
      ...(params.tag ? resolveTagList(app, params.tag) : []),
    ]);

    if (files.length === 0) {
      throw new Error("No matching notes found for the given file/folder/tag.");
    }

    const contents = await Promise.all(files.map((file) => app.vault.cachedRead(file)));
    return {
      content: contents.join("\n\n"),
      sourceLabel: files.length === 1 ? files[0].path : `${files.length} notes`,
      files,
    };
  }

  return { content: selfContent, sourceLabel: "this note", files: [] };
}

/** Strips the code block spanning `[lineStart, lineEnd]` (0-based, inclusive) out of `text`. */
export function stripOwnBlock(text: string, lineStart: number, lineEnd: number): string {
  const lines = text.split("\n");
  return [...lines.slice(0, lineStart), ...lines.slice(lineEnd + 1)].join("\n");
}
