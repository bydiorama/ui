import { cliFilename, installCommand, shadcnCommand } from "./install";
import data from "../data/catalog.generated.json";

export interface Item {
  name: string; title: string; category: string; type: string;
  status: string; lead: string;
  files: { path: string; target: string }[];
  dependencies: string[]; registryDependencies: string[];
  contrast: { role?: string; floor: string; light: number; dark: number }[] | null;
  docs: {
    summary: string; composition?: string; design?: string;
    anatomy: { part: string; slot?: string | null; notes?: string }[];
    props: Record<string, { type?: string; default?: unknown; notes?: string }>;
    do?: string[]; dont?: string[]; motion?: string;
    knownGaps?: string[]; needsDesign?: string[];
    a11y: { role?: string; keyboard?: { key: string; does: string }[]; [key: string]: unknown };
  };
  changes: { id: string; date: string; kind: string; summary: string }[];
}
export const catalog = data as unknown as { categories: string[]; items: Item[] };

const cell = (value: unknown) => String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
export function markdown(item: Item) {
  const list = (values: readonly string[]) => values.map(text => `- ${text}`).join("\n");
  return [
    `# ${item.title}`, item.lead, `Status: ${item.status}. Category: ${item.category}.`,
    "## Installation", `\`\`\`sh\n${installCommand(item.name)}\n\`\`\``,
    `Download [the CLI preview](/downloads/${cliFilename}) into your project and [initialise it](/docs/#install). The npm release is being prepared.`,
    "### Existing shadcn apps", `\`\`\`sh\n${shadcnCommand(item.name)}\n\`\`\``,
    'First add "@bydiorama": "https://raw.githubusercontent.com/bydiorama/ui/main/r/{name}.json" to the registries object in components.json. See /docs/ for tokens, font and alias setup.',
    "## Props", ["| Prop | Type | Default | Notes |", "| --- | --- | --- | --- |",
      ...Object.entries(item.docs.props).map(([name, prop]) => `| ${cell(name)} | ${cell(prop.type)} | ${cell(prop.default)} | ${cell(prop.notes)} |`)].join("\n"),
    "## Anatomy", list(item.docs.anatomy.map(part => `${part.part}${part.slot ? ` (data-slot=${part.slot})` : ""}: ${part.notes ?? ""}`)),
    ...(item.docs.composition ? ["## Composition", `\`\`\`text\n${item.docs.composition}\n\`\`\``] : []),
    "## Accessibility", item.docs.a11y.role ?? "See the keyboard contract below.",
    list((item.docs.a11y.keyboard ?? []).map(row => `${row.key}: ${row.does}`)),
    ...Object.entries(item.docs.a11y).filter(([key, value]) => key !== "role" && typeof value === "string").map(([key, value]) => `### ${key}\n\n${value}`),
    "## Use", list(item.docs.do ?? []),
    "## Avoid", list(item.docs.dont ?? []),
    ...(item.docs.motion ? ["## Motion", item.docs.motion] : []),
    ...((item.docs.knownGaps?.length ?? 0) ? ["## Known limits", list(item.docs.knownGaps!)] : []),
    "## Source", list(item.files.map(file => `[${file.target}](https://github.com/bydiorama/ui/blob/main/${file.path})`)),
  ].join("\n\n") + "\n";
}
