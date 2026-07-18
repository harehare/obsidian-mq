import { MarkdownRenderChild, MarkdownRenderer, TFile, debounce } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import type MqPlugin from "./main";
import { resolveBlockInput, stripOwnBlock } from "./dataSource";
import { getBlockParams, type MqBlockParams } from "./util/params";
import { run } from "./mq/wasm";

export function registerMqCodeBlockProcessor(plugin: MqPlugin): void {
  plugin.registerMarkdownCodeBlockProcessor("mq", (source, el, ctx) => {
    const child = new MqBlockRenderChild(plugin, source, el, ctx);
    ctx.addChild(child);
  });
}

class MqBlockRenderChild extends MarkdownRenderChild {
  private readonly plugin: MqPlugin;
  private readonly source: string;
  private readonly ctx: MarkdownPostProcessorContext;
  private readonly params: MqBlockParams;
  /** Own block's line range at render-registration time, used to exclude it from self-note input. */
  private readonly ownRange: { lineStart: number; lineEnd: number } | null;
  private watchedPaths: string[] = [];

  constructor(plugin: MqPlugin, source: string, containerEl: HTMLElement, ctx: MarkdownPostProcessorContext) {
    super(containerEl);
    this.plugin = plugin;
    this.source = source;
    this.ctx = ctx;
    // `getSectionInfo` is only reliable synchronously, right when the post-processor runs —
    // it can return null once called later (e.g. from inside an async re-render), so both
    // the block params and its own line range are captured up front here.
    this.params = getBlockParams(ctx, containerEl);
    const info = ctx.getSectionInfo(containerEl);
    this.ownRange = info ? { lineStart: info.lineStart, lineEnd: info.lineEnd } : null;
  }

  onload(): void {
    const rerender = debounce(() => void this.render(), 300, true);

    this.registerEvent(
      this.plugin.app.vault.on("modify", (file) => {
        if (file instanceof TFile && this.watchedPaths.includes(file.path) && this.plugin.settings.autoRefreshBlocks) {
          rerender();
        }
      }),
    );

    void this.render();
  }

  private async render(): Promise<void> {
    const { app, settings } = this.plugin;
    const container = this.containerEl;
    container.empty();
    const resultEl = container.createDiv({ cls: "mq-block-result" });
    const loading = resultEl.createDiv({ cls: "mq-block-loading", text: "Running mq query…" });

    const ownFile = app.vault.getAbstractFileByPath(this.ctx.sourcePath);
    if (!(ownFile instanceof TFile)) {
      loading.setText("mq: could not resolve the current note.");
      return;
    }

    try {
      const noteText = await app.vault.cachedRead(ownFile);
      const selfContent = this.ownRange
        ? stripOwnBlock(noteText, this.ownRange.lineStart, this.ownRange.lineEnd)
        : noteText;

      const resolved = await resolveBlockInput(app, this.ctx.sourcePath, this.params, selfContent, settings);
      this.watchedPaths = resolved.files.length > 0 ? resolved.files.map((f) => f.path) : [ownFile.path];

      const result = await run(this.source, resolved.content, {
        listStyle: settings.listStyle,
        linkTitleStyle: settings.linkTitleStyle,
        linkUrlStyle: settings.linkUrlStyle,
        timeoutMs: settings.timeoutMs,
        allowedDomains: settings.allowedDomains,
      });

      loading.remove();
      resultEl.createDiv({ cls: "mq-block-source", text: `mq · ${resolved.sourceLabel}` });

      const output = result.trim().length > 0 ? result : "_(empty result)_";
      await MarkdownRenderer.render(app, output, resultEl, this.ctx.sourcePath, this.plugin);
    } catch (error) {
      loading.remove();
      resultEl.empty();
      resultEl.createDiv({
        cls: "mq-block-error",
        text: `mq error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}
