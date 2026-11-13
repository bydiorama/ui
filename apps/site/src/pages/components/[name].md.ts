import type { APIRoute } from "astro";
import { catalog, markdown } from "../../lib/catalog";
export function getStaticPaths() { return catalog.items.map(item => ({ params: { name: item.name }, props: { item } })); }
export const GET: APIRoute = ({ props }) => new Response(markdown(props.item), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
