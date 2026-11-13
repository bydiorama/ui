import type { APIRoute } from "astro";
import { catalog } from "../lib/catalog";
export const GET: APIRoute = () => new Response([
  "# Diorama UI", "", "React components distributed as source. Keep design decisions explicit, use semantic tokens, and own the code you install.",
  "", "## Start here", "- [Getting started](/docs/)", "- [Working with agents](/docs/agents/)", "- [Complete component reference](/llms-full.txt)",
  "", "## Components", ...catalog.items.map(item => `- [${item.title}](/components/${item.name}.md): ${item.lead}`),
].join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
