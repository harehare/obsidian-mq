import type { App } from "obsidian";

/**
 * Minimal shape of the parts of Dataview's plugin API this bridge relies on. Dataview isn't
 * a dependency of this plugin (it's optional), so this is intentionally loose rather than
 * imported from `obsidian-dataview`.
 */
interface DataviewApi {
  query(source: string, originFile?: string): Promise<DataviewQueryResult>;
}

type DataviewQueryResult =
  | { successful: true; value: DataviewQueryValue }
  | { successful: false; error: string };

type DataviewQueryValue =
  | { type: "table"; headers: string[]; values: unknown[][] }
  | { type: "list"; values: unknown[] }
  | { type: "task"; values: DataviewTaskLike[] };

interface DataviewTaskLike {
  text?: string;
  completed?: boolean;
}

export function getDataviewApi(app: App): DataviewApi | undefined {
  const plugins = (app as unknown as { plugins: { plugins: Record<string, unknown> } }).plugins;
  const dataviewPlugin = plugins?.plugins?.dataview as { api?: DataviewApi } | undefined;
  return dataviewPlugin?.api;
}

/** Runs a Dataview DQL query and renders its result as Markdown mq can consume as input. */
export async function runDataviewQuery(app: App, query: string, sourcePath: string): Promise<string> {
  const api = getDataviewApi(app);
  if (!api) {
    throw new Error("Dataview plugin is not installed or enabled.");
  }

  const result = await api.query(query, sourcePath);
  if (!result.successful) {
    throw new Error(`Dataview query failed: ${result.error}`);
  }

  return renderDataviewValue(result.value);
}

function renderDataviewValue(value: DataviewQueryValue): string {
  switch (value.type) {
    case "table":
      return renderTable(value.headers, value.values);
    case "list":
      return value.values.map((item) => `- ${stringifyLiteral(item)}`).join("\n") + "\n";
    case "task":
      return (
        value.values
          .map((task) => `- [${task.completed ? "x" : " "}] ${task.text ?? ""}`)
          .join("\n") + "\n"
      );
  }
}

function renderTable(headers: string[], rows: unknown[][]): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.map(stringifyLiteral).join(" | ")} |`);
  return [headerLine, separatorLine, ...rowLines].join("\n") + "\n";
}

function stringifyLiteral(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "markdown" in value) {
    const withMarkdown = value as { markdown: () => string };
    if (typeof withMarkdown.markdown === "function") {
      return withMarkdown.markdown().replace(/\|/g, "\\|");
    }
  }
  return String(value).replace(/\|/g, "\\|");
}
