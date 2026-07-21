import { Notice, TFile, normalizePath } from "obsidian";
import type MqPlugin from "../main";
import { ConfirmModal } from "../modals/ConfirmModal";
import { VaultQueryModal, type VaultQueryInput } from "../modals/VaultQueryModal";
import { dedupeFiles, resolveFolderList, resolveTagList } from "../util/files";
import { run } from "../mq/wasm";

export function registerVaultQueryCommand(plugin: MqPlugin): void {
  plugin.addCommand({
    id: "run-query-on-vault",
    name: "Run query across the vault",
    callback: () => {
      new VaultQueryModal(plugin.app, (input) => void handleVaultQuery(plugin, input)).open();
    },
  });
}

async function handleVaultQuery(plugin: MqPlugin, input: VaultQueryInput): Promise<void> {
  const files = resolveScope(plugin, input.folder, input.tag);
  if (files.length === 0) {
    new Notice("mq: no matching notes found for that folder/tag scope.");
    return;
  }

  if (input.action === "report") {
    await runReport(plugin, input, files);
    return;
  }

  new ConfirmModal(
    plugin.app,
    `This will overwrite ${files.length} note${files.length === 1 ? "" : "s"} with the result of the query. This cannot be undone automatically. Continue?`,
    `Update ${files.length} note${files.length === 1 ? "" : "s"}`,
    () => void runUpdate(plugin, input, files),
  ).open();
}

function resolveScope(plugin: MqPlugin, folder: string, tag: string): TFile[] {
  const trimmedFolder = folder.trim();
  const trimmedTag = tag.trim();

  if (!trimmedFolder && !trimmedTag) {
    return plugin.app.vault.getMarkdownFiles();
  }

  const files = dedupeFiles([
    ...(trimmedFolder ? resolveFolderList(plugin.app, trimmedFolder) : []),
    ...(trimmedTag ? resolveTagList(plugin.app, trimmedTag) : []),
  ]);

  // When both are given, only keep notes that satisfy both constraints.
  if (trimmedFolder && trimmedTag) {
    const folderFiles = new Set(resolveFolderList(plugin.app, trimmedFolder).map((f) => f.path));
    const tagFiles = new Set(resolveTagList(plugin.app, trimmedTag).map((f) => f.path));
    return files.filter((f) => folderFiles.has(f.path) && tagFiles.has(f.path));
  }

  return files;
}

async function runReport(plugin: MqPlugin, input: VaultQueryInput, files: TFile[]): Promise<void> {
  const notice = new Notice(`mq: running query on ${files.length} notes…`, 0);
  const sections: string[] = [];
  let failures = 0;

  for (const file of files) {
    try {
      const content = await plugin.app.vault.cachedRead(file);
      const result = await run(input.query, content, {
        listStyle: plugin.settings.listStyle,
        linkTitleStyle: plugin.settings.linkTitleStyle,
        linkUrlStyle: plugin.settings.linkUrlStyle,
        timeoutMs: plugin.settings.timeoutMs,
        allowedDomains: plugin.settings.allowedDomains,
      });
      if (result.trim().length > 0) {
        sections.push(`## [[${file.path}|${file.basename}]]\n\n${result}`);
      }
    } catch (error) {
      failures += 1;
      sections.push(`## [[${file.path}|${file.basename}]]\n\n> mq error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  notice.hide();

  const reportPath = normalizePath(`mq-report-${formatTimestamp(new Date())}.md`);
  const body = `# mq vault report\n\nQuery: \`${input.query}\`\nScope: ${files.length} note(s)${input.folder ? ` in "${input.folder}"` : ""}${input.tag ? ` tagged "${input.tag}"` : ""}\n\n${sections.join("\n\n")}\n`;
  const reportFile = await plugin.app.vault.create(reportPath, body);
  await plugin.app.workspace.getLeaf(true).openFile(reportFile);

  new Notice(`mq: report ready (${files.length - failures}/${files.length} notes succeeded).`);
}

async function runUpdate(plugin: MqPlugin, input: VaultQueryInput, files: TFile[]): Promise<void> {
  const notice = new Notice(`mq: updating ${files.length} notes…`, 0);
  let succeeded = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      const content = await plugin.app.vault.read(file);
      const result = await run(input.query, content, {
        isUpdate: input.preserveStructure,
        listStyle: plugin.settings.listStyle,
        linkTitleStyle: plugin.settings.linkTitleStyle,
        linkUrlStyle: plugin.settings.linkUrlStyle,
        timeoutMs: plugin.settings.timeoutMs,
        allowedDomains: plugin.settings.allowedDomains,
      });
      await plugin.app.vault.modify(file, result);
      succeeded += 1;
    } catch (error) {
      errors.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  notice.hide();

  if (errors.length > 0) {
    console.error("mq: vault query update errors", errors);
  }
  new Notice(
    `mq: updated ${succeeded}/${files.length} notes.` + (errors.length > 0 ? " See console for errors." : ""),
    8000,
  );
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
