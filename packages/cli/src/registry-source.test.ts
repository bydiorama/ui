import test from "node:test";
import assert from "node:assert/strict";
import { listRegistryItems } from "./registry-source.ts";

test("the hosted index is beside the registry items", async () => {
  const before = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async input => { urls.push(String(input)); return new Response(JSON.stringify({ items: [{ name: "button" }] })); };
  try {
    assert.deepEqual(await listRegistryItems({ urlTemplate: "https://ui.example/r/{name}.json" }), ["button"]);
    assert.deepEqual(urls, ["https://ui.example/r/registry.json"]);
  } finally { globalThis.fetch = before; }
});

test("the GitHub mirror falls back to its historical index", async () => {
  const before = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async input => { const url = String(input); urls.push(url); return url.includes("/r/registry.json") ? new Response(null, { status: 404 }) : new Response(JSON.stringify({ items: [{ name: "button" }] })); };
  try {
    assert.deepEqual(await listRegistryItems({ urlTemplate: "https://raw.example/main/r/{name}.json" }), ["button"]);
    assert.deepEqual(urls, ["https://raw.example/main/r/registry.json", "https://raw.example/main/registry.json"]);
  } finally { globalThis.fetch = before; }
});
