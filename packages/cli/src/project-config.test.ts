import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_REGISTRY, initProject, readProjectConfig } from "./project-config.ts";

test("owned init needs no shadcn config, preserves existing files and is idempotent", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "diorama-init-"));
  try {
    await writeFile(join(cwd, "app.tsx"), "my application");
    const first = await initProject(cwd, "src");
    assert.equal(first.created, true);
    assert.equal(first.config.sourceRoot, "src");
    assert.equal(first.config.registries["@bydiorama"], DEFAULT_REGISTRY);
    const before = await readFile(join(cwd, "ui.config.json"), "utf8");
    assert.equal((await initProject(cwd, "other")).created, false);
    assert.equal(await readFile(join(cwd, "ui.config.json"), "utf8"), before);
    assert.equal(await readFile(join(cwd, "app.tsx"), "utf8"), "my application");
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("existing shadcn apps retain their aliases and explicitly select the Diorama registry", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "diorama-migrate-"));
  try {
    await writeFile(join(cwd, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
    const legacy = JSON.stringify({ aliases: { ui: "@/components/ui" }, registries: { "@other": "https://other.example/{name}", "@bydiorama": "https://ours.example/{name}.json" } });
    await writeFile(join(cwd, "components.json"), legacy);
    assert.equal((await readProjectConfig(cwd)).registries["@bydiorama"], "https://ours.example/{name}.json");
    await initProject(cwd);
    assert.equal((await readProjectConfig(cwd)).aliases.ui, "@/components/ui");
    assert.equal(await readFile(join(cwd, "components.json"), "utf8"), legacy);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("init refuses a source path outside the project", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "diorama-init-path-"));
  try { await assert.rejects(initProject(cwd, "../outside"), /inside your project/); }
  finally { await rm(cwd, { recursive: true, force: true }); }
});
