import type { APIRoute } from "astro";
import { catalog, markdown } from "../lib/catalog";
export const GET: APIRoute = () => new Response(catalog.items.map(markdown).join("\n---\n\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
