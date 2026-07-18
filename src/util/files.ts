import { App, TFile, TFolder, getAllTags } from "obsidian";

/** Resolves a comma-separated list of note names/paths/links to vault files. */
export function resolveFileList(app: App, raw: string, sourcePath: string): TFile[] {
  const files: TFile[] = [];
  for (const token of splitList(raw)) {
    const file = app.metadataCache.getFirstLinkpathDest(stripWikilink(token), sourcePath);
    if (file instanceof TFile) {
      files.push(file);
    }
  }
  return files;
}

/** Resolves a comma-separated list of folder paths to every Markdown file within them (recursively). */
export function resolveFolderList(app: App, raw: string): TFile[] {
  const files: TFile[] = [];
  for (const token of splitList(raw)) {
    const normalized = normalizeFolderPath(token);
    const folder = app.vault.getAbstractFileByPath(normalized);
    if (folder instanceof TFolder) {
      collectMarkdownFiles(folder, files);
    }
  }
  return files;
}

/** Resolves a comma-separated list of tags (with or without `#`) to every Markdown file carrying any of them. */
export function resolveTagList(app: App, raw: string): TFile[] {
  const wanted = new Set(splitList(raw).map((tag) => normalizeTag(tag)));
  if (wanted.size === 0) return [];

  const files: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) continue;
    const tags = getAllTags(cache) ?? [];
    if (tags.some((tag) => wanted.has(normalizeTag(tag)))) {
      files.push(file);
    }
  }
  return files;
}

/** Deduplicates files by path, preserving first-seen order. */
export function dedupeFiles(files: TFile[]): TFile[] {
  const seen = new Set<string>();
  const result: TFile[] = [];
  for (const file of files) {
    if (!seen.has(file.path)) {
      seen.add(file.path);
      result.push(file);
    }
  }
  return result;
}

function collectMarkdownFiles(folder: TFolder, into: TFile[]): void {
  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md") {
      into.push(child);
    } else if (child instanceof TFolder) {
      collectMarkdownFiles(child, into);
    }
  }
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function stripWikilink(token: string): string {
  return token.replace(/^\[\[/, "").replace(/\]\]$/, "");
}

function normalizeFolderPath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizeTag(tag: string): string {
  const withHash = tag.startsWith("#") ? tag : `#${tag}`;
  return withHash.toLowerCase();
}
