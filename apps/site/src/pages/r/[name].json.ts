import type { APIRoute } from "astro";
import index from "../../../../../registry.json?raw";
const files = import.meta.glob<string>("../../../../../r/*.json", { eager: true, query: "?raw", import: "default" });
const items = Object.fromEntries(Object.entries(files).map(([path, content]) => [path.split("/").at(-1)!.replace(/\.json$/, ""), content]));
export function getStaticPaths() { return [...Object.keys(items), "registry"].map(name => ({ params: { name } })); }
export const GET: APIRoute = ({ params }) => new Response(params.name === "registry" ? index : items[params.name!], { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
