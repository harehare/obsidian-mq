// Thin wrapper around the mq-wasm bindings shipped inside the published `mq-web` npm
// package (its `dist/` contains the raw wasm-pack `--target web` output alongside the
// bundled JS/TS API, and has no "exports" restriction, so both are reachable as deep
// imports).
//
// The .wasm binary is inlined into this plugin's bundle at build time: esbuild.config.mjs
// gzips it and its `dataurl` loader base64-encodes the result (NOT the `binary` loader,
// which emits a call to `Uint8Array.fromBase64` that doesn't exist in Obsidian's
// Electron/Chromium yet). It's decoded and inflated below with `atob` and
// `DecompressionStream("gzip")`, then instantiated with the named `initSync` export
// instead of `fetch()`-ing a sibling file. That keeps the plugin a single `main.js`
// well under Obsidian Sync's 5 MB per-file limit, with no extra assets to ship, and
// works the same on desktop and mobile.
//
// `initSync` MUST be a named import here, not the default import: this module's default
// export is `__wbg_init`, the async `fetch()`-based initializer (see `export { initSync,
// __wbg_init as default }` in mq-wasm's generated glue) — importing it as `initSync` by
// mistake compiles fine but silently calls the wrong (async, fetch-based) function.
import {
  initSync,
  run as wasmRun,
  format as wasmFormat,
  diagnostics as wasmDiagnostics,
  inlayHints as wasmInlayHints,
  hover as wasmHover,
  definedValues as wasmDefinedValues,
  toHtml as wasmToHtml,
  htmlToMarkdown as wasmHtmlToMarkdown,
  toAst as wasmToAst,
} from "mq-web/dist/mq_wasm.js";
import type {
  Options,
  Diagnostic,
  InlayHint,
  HoverResult,
  DefinedValue,
  ConversionOptions,
} from "mq-web/dist/mq_wasm.js";
import wasmDataUrl from "mq-web/dist/mq_wasm_bg.wasm";

export type { Options, Diagnostic, InlayHint, HoverResult, DefinedValue };

/** Decodes an esbuild `dataurl`-loader `data:...;base64,...` string to (gzip-compressed) bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binaryString.length));
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Inflates the gzip-compressed wasm binary embedded in the bundle (see esbuild.config.mjs). */
async function decompressGzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

let initPromise: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  initPromise ??= decompressGzip(dataUrlToBytes(wasmDataUrl)).then((wasmBytes) => {
    initSync({ module: wasmBytes });
  });
  return initPromise;
}

const DEFAULT_OPTIONS: Options = {
  isUpdate: false,
  inputFormat: "markdown",
  listStyle: "dash",
  linkTitleStyle: "paren",
  linkUrlStyle: "none",
};

/** Runs an mq query over `content` and returns the resulting Markdown. */
export async function run(
  code: string,
  content: string,
  options: Partial<Options> = {},
): Promise<string> {
  await ensureInit();
  return wasmRun(code, content, { ...DEFAULT_OPTIONS, ...options });
}

/** Formats mq source code. */
export async function format(code: string): Promise<string> {
  await ensureInit();
  return wasmFormat(code);
}

/** Returns parse/type diagnostics for mq source code. */
export async function diagnostics(
  code: string,
  enableTypeCheck?: boolean,
): Promise<ReadonlyArray<Diagnostic>> {
  await ensureInit();
  return wasmDiagnostics(code, enableTypeCheck);
}

/** Returns inlay type hints for mq source code. */
export async function inlayHints(code: string): Promise<ReadonlyArray<InlayHint>> {
  await ensureInit();
  return wasmInlayHints(code);
}

/** Returns hover information for the symbol at `line`/`column` (1-based), or `null`. */
export async function hover(
  code: string,
  line: number,
  column: number,
): Promise<HoverResult | null> {
  await ensureInit();
  return wasmHover(code, line, column);
}

/** Lists functions/selectors/variables defined in mq source code, for completion. */
export async function definedValues(
  code: string,
  module?: string,
): Promise<ReadonlyArray<DefinedValue>> {
  await ensureInit();
  return wasmDefinedValues(code, module);
}

/** Converts Markdown to HTML. */
export async function toHtml(markdown: string): Promise<string> {
  await ensureInit();
  return wasmToHtml(markdown);
}

/** Converts HTML to Markdown. */
export async function htmlToMarkdown(
  html: string,
  options?: ConversionOptions,
): Promise<string> {
  await ensureInit();
  return wasmHtmlToMarkdown(html, options);
}

/** Parses mq source code and returns its AST as a JSON string. */
export async function toAst(code: string): Promise<string> {
  await ensureInit();
  return wasmToAst(code);
}
